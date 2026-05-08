import { Router, Request, Response } from 'express';
import {
  findUserByEmail,
  findUserById,
  createUser,
} from '../db/index';
import { hashPassword, verifyPassword, validatePassword } from '../services/password';
import { signToken } from '../services/token';
import { verifyToken } from '../services/token';
import {
  generateDeviceFlow,
  getDeviceFlowSession,
  approveDeviceFlow,
} from '../services/deviceFlow';

const router = Router();

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ error: 'Email, name and password are required' });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }

    const existing = await findUserByEmail(email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const password_hash = await hashPassword(password);
    const user = await createUser({
      email: email.toLowerCase(),
      name,
      passwordHash: password_hash,
    });

    const token = signToken({ userId: user.id, email: user.email, name: user.name });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await findUserByEmail(email.toLowerCase());
    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, name: user.name });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ─── Device Flow for CLI ───────────────────────────────────────────────
// POST /auth/device-code - CLI requests a device code
router.post('/device-code', async (req: Request, res: Response) => {
  try {
    const baseUrl = req.body.baseUrl || `${req.protocol}://${req.get('host')}`;
    const flow = generateDeviceFlow(baseUrl);
    res.json(flow);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate device code' });
  }
});

// POST /auth/device-token - CLI polls for token after user approves
router.post('/device-token', async (req: Request, res: Response) => {
  try {
    const { deviceCode } = req.body;
    if (!deviceCode) {
      res.status(400).json({ error: 'deviceCode is required' });
      return;
    }

    const session = getDeviceFlowSession(deviceCode);
    if (!session) {
      res.status(400).json({ error: 'Device code expired or not found' });
      return;
    }

    if (!session.approved) {
      res.status(202).json({ error: 'Pending user approval' });
      return;
    }

    res.json({
      token: session.token,
      email: session.email,
      name: session.name,
    });
  } catch (err) {
    res.status(500).json({ error: 'Token poll failed' });
  }
});

// GET /auth/device - Web page for user to approve (shown in browser)
router.get('/device', async (req: Request, res: Response) => {
  try {
    const { userCode } = req.query;
    
    // Simple HTML page for user to enter email/password and approve
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Approve CLI Login</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 100px auto; }
          .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
          button { width: 100%; padding: 10px; background: #0052cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
          .code { background: #f5f5f5; padding: 15px; border-radius: 4px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
          .error { color: red; display: none; }
          .success { color: green; display: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 Approve CLI Login</h1>
          <p>Your device code:</p>
          <div class="code">${userCode}</div>
          <form id="approveForm">
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit">Approve & Login</button>
          </form>
          <div class="error" id="error"></div>
          <div class="success" id="success">✓ Approval sent! Check your CLI.</div>
        </div>
        <script>
          document.getElementById('approveForm').onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
              const response = await fetch('/auth/approve-device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userCode: '${userCode}', email, password })
              });
              
              if (response.ok) {
                document.getElementById('success').style.display = 'block';
                document.getElementById('approveForm').style.display = 'none';
              } else {
                const data = await response.json();
                document.getElementById('error').textContent = data.error;
                document.getElementById('error').style.display = 'block';
              }
            } catch (err) {
              document.getElementById('error').textContent = 'Network error';
              document.getElementById('error').style.display = 'block';
            }
          };
        </script>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading device approval page');
  }
});

// POST /auth/approve-device - User submits email/password to approve
router.post('/approve-device', async (req: Request, res: Response) => {
  try {
    const { userCode, email, password } = req.body;

    if (!userCode || !email || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify user credentials
    const user = await findUserByEmail(email.toLowerCase());
    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate token and approve device flow
    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    const approved = approveDeviceFlow(userCode, user.id, user.email, user.name, token);

    if (!approved) {
      res.status(400).json({ error: 'Device code not found or expired' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Approve device error:', err);
    res.status(500).json({ error: 'Approval failed' });
  }
});

export default router;
