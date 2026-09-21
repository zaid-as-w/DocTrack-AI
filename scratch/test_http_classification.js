async function testEndpoints() {
  const categoriesRes = await fetch('http://localhost:5000/api/classification/categories');
  const catData = await categoriesRes.json();
  console.log('Categories status:', categoriesRes.status, 'Count:', catData.count);

  const classifyRes = await fetch('http://localhost:5000/api/classification/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'FORM 23 REGISTRATION CERTIFICATE KA01AB1234 HONDA CITY',
      fileName: 'car_rc.pdf'
    })
  });
  const classifyData = await classifyRes.json();
  console.log('Classify status:', classifyRes.status, 'Category:', classifyData.data?.category, 'Sensitivity:', classifyData.data?.sensitivity);
}

testEndpoints().catch(e => console.error('Fetch error:', e));
