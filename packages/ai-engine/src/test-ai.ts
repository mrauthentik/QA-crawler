import { generateTestPlan } from "./planner";

async function main(){
    // we are stimulating what the crawler would return
    const mockCrawlData = {
     url: 'https://example.com',
     title:' Example Domain',
     links: ['https://iana.org/domains/example'],
     forms:[],
     errors: []
    }
     const appDescription = `
    A simple website that serves as an example domain. 
    It should display a heading, a paragraph of text, 
    and a link to more information. It should load fast 
    and have no broken links.
  `;

  try {
    const plan = await generateTestPlan(appDescription, mockCrawlData);
    console.log('✅ Test plan generated successfully!\n');
    console.log(`📋 Total test cases: ${plan.totalTests}`);
    console.log('\n--- TEST CASES ---');
    plan.cases.forEach(tc => {
      console.log(`\n[${tc.priority.toUpperCase()}] ${tc.id}: ${tc.name}`);
      console.log(`Type: ${tc.type}`);
      console.log(`Steps:`);
      tc.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
      console.log(`Expected: ${tc.expectedOutcome}`);
    });
  } catch (err) {
    console.error('Failed:', err);
  }
}
main()