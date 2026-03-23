const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb+srv://nikunjadhiya32:nikunj12345@cluster0.iqlhxn9.mongodb.net/test');
  try {
    await mongoose.connection.db.collection('users').dropIndex('email_1');
    console.log('Index dropped successfully');
  } catch(e) {
    console.log('Error dropping index:', e.message);
  }
  process.exit(0);
}
run();
