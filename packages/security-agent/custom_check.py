def run_custom_check(url=None, headers=None):
    # Example: just return a dummy result
    return {
        'id': 'CU002',
        'name': 'Custom Check (User Script)',
        'status': 'passed',
        'severity': 'info',
        'what': f'Custom check ran for {url}',
        'why': 'User script executed',
        'how': 'This is a user-defined check. Edit custom_check.py to customize.'
    }
