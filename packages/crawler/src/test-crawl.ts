import { crawlPage } from "./index";

async function main(){
     console.log('🕵️  Starting crawl test...');
  const result = await crawlPage('https://example.com');
  console.log('✅ Title:', result.title);
  console.log('🔗 Links found:', result.links.length);
  console.log('📋 Forms found:', result.forms.length);
  console.log('❌ Console errors:', result.errors.length);
  console.log('\nFull result:', JSON.stringify(result, null, 2));
}

main().catch(console.error)