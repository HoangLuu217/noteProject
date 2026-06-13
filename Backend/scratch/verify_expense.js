const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTI5OGIxMDIwZGRlNzExOGZlM2JmM2IiLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzgxMTU3MTQ4LCJleHAiOjE4MTI2OTMxNDh9.4VWdOQpoI8bmG9O-sod8IaHwUFK-PRxNgsKNCzpW4sY';
const BASE_URL = 'http://localhost:5001/api/expenses';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

const runTests = async () => {
  console.log('--- STARTING EXPENSE API TESTS ---');

  // 1. Create Expense
  console.log('\n1. Testing POST /api/expenses (Create)...');
  const createPayload = {
    title: 'Weekly Groceries',
    category: 'Food',
    expenseDate: new Date().toISOString(),
    note: 'Bought veggies and fruits',
    items: [
      { itemName: 'Apples', quantity: 5, unitPrice: 2, amount: 10 },
      { itemName: 'Bananas', quantity: 10, unitPrice: 1, amount: 10 }
    ],
    totalAmount: 20
  };

  const createRes = await fetch(`${BASE_URL}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(createPayload)
  });

  const createData = await createRes.json();
  console.log('Status:', createRes.status);
  console.log('Response:', JSON.stringify(createData, null, 2));

  if (!createData.success) {
    throw new Error('Create expense failed');
  }

  const createdId = createData.data.expense._id;

  // 2. Get All Expenses
  console.log('\n2. Testing GET /api/expenses (List)...');
  const listRes = await fetch(`${BASE_URL}`, {
    method: 'GET',
    headers
  });
  const listData = await listRes.json();
  console.log('Status:', listRes.status);
  console.log('Total Expenses Found:', listData.data.expenses.length);

  // 3. Get Expense by ID
  console.log(`\n3. Testing GET /api/expenses/${createdId} (Get Single)...`);
  const getRes = await fetch(`${BASE_URL}/${createdId}`, {
    method: 'GET',
    headers
  });
  const getData = await getRes.json();
  console.log('Status:', getRes.status);
  console.log('Title:', getData.data.expense.title);

  // 4. Update Expense
  console.log(`\n4. Testing PUT /api/expenses/${createdId} (Update)...`);
  const updatePayload = {
    title: 'Weekly Groceries (Updated)',
    totalAmount: 25,
    items: [
      { itemName: 'Apples', quantity: 5, unitPrice: 2, amount: 10 },
      { itemName: 'Bananas', quantity: 10, unitPrice: 1, amount: 10 },
      { itemName: 'Orange Juice', quantity: 1, unitPrice: 5, amount: 5 }
    ]
  };

  const updateRes = await fetch(`${BASE_URL}/${createdId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updatePayload)
  });
  const updateData = await updateRes.json();
  console.log('Status:', updateRes.status);
  console.log('Updated Title:', updateData.data.expense.title);
  console.log('Updated Total Amount:', updateData.data.expense.totalAmount);
  console.log('Number of Items:', updateData.data.expense.items.length);

  // 5. Delete Expense
  console.log(`\n5. Testing DELETE /api/expenses/${createdId} (Delete)...`);
  const deleteRes = await fetch(`${BASE_URL}/${createdId}`, {
    method: 'DELETE',
    headers
  });
  const deleteData = await deleteRes.json();
  console.log('Status:', deleteRes.status);
  console.log('Deleted ID:', deleteData.data.expenseId);

  // 6. Verify Deletion
  console.log(`\n6. Verifying Deletion...`);
  const verifyRes = await fetch(`${BASE_URL}/${createdId}`, {
    method: 'GET',
    headers
  });
  const verifyData = await verifyRes.json();
  console.log('Status (Should be 404):', verifyRes.status);
  console.log('Response Message:', verifyData.message);

  console.log('\n--- ALL TESTS COMPLETED ---');
};

runTests().catch(err => {
  console.error('Test run failed:', err);
});
