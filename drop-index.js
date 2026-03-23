const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb://localhost:27017/dwpl');
  try {
    await mongoose.connection.db.collection('users').dropIndex('email_1');
    console.log('Index dropped successfully');
  } catch(e) {
    console.log('Error dropping index:', e.message);
  }
  process.exit(0);
}
run();
