const fetch = global.fetch;
(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/documents/demo-doc-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', stage: 4, history: [{ t: 'Approved by A. Rao', at: '11:20' }] }),
    });
    const text = await res.text();
    console.log('status', res.status);
    console.log(text);
  } catch (error) {
    console.error(error);
  }
})();
