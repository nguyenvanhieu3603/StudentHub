const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { auth, restrictToAdmin } = require('../middleware/auth');
const { processExcelFile, exportToExcel } = require('../utils/common');
const path = require('path');

// Register a new user
router.post('/register', async (req, res) => {
  const { username, account, password, phone, address, sex, dateBirth, role } = req.body;
  try {
    if (!username || !account || !password) {
      throw new Error('Username, account, and password are required');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$|^[A-Z0-9]{5,10}$/.test(account)) {
      throw new Error('Invalid account format');
    }

    const existingUser = await User.findOne({ account });
    if (existingUser) {
      throw new Error('Account already exists');
    }

    const user = new User({
      username,
      account,
      password,
      phone,
      address,
      sex: sex || 0,
      dateBirth: dateBirth ? new Date(dateBirth) : null,
      role: role || 'lecturer',
    });

    await user.save();
    res.status(201).json({ status: true, message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// User login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  try {
    if (!identifier || !password) {
      throw new Error('Identifier and password are required');
    }

    const user = await User.findOne({
      $or: [{ account: identifier }, { username: identifier }],
    });
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({
      status: true,
      account: {
        id: user._id,
        username: user.username,
        account: user.account,
        phone: user.phone,
        address: user.address,
        sex: user.sex,
        dateBirth: user.dateBirth,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(400).json({ status: false, message: err.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      status: true,
      account: {
        id: req.user._id,
        username: req.user.username,
        account: req.user.account,
        phone: req.user.phone,
        address: req.user.address,
        sex: req.user.sex,
        dateBirth: req.user.dateBirth,
        role: req.user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to fetch profile', error: err.message });
  }
});

// Update user information
router.post('/update', auth, async (req, res) => {
  const { id, username, password, phone, address, sex, dateBirth } = req.body;
  try {
    if (!id) {
      throw new Error('User ID is required');
    }
    if (password && password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    user.username = username || user.username;
    if (password) user.password = password;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.sex = sex !== undefined ? sex : user.sex;
    user.dateBirth = dateBirth ? new Date(dateBirth) : user.dateBirth;

    await user.save();
    res.json({
      status: true,
      account: {
        id: user._id,
        username: user.username,
        account: user.account,
        phone: user.phone,
        address: user.address,
        sex: user.sex,
        dateBirth: user.dateBirth,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Delete a user
router.post('/delete', auth, async (req, res) => {
  const { id } = req.body;
  try {
    if (!id) {
      throw new Error('User ID is required');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role === 'admin' && req.user.role !== 'admin') {
      throw new Error('Cannot delete admin account');
    }

    await user.deleteOne();
    res.json({ status: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Get list of users
router.post('/getlist', auth, restrictToAdmin, async (req, res) => {
  const { username, account, role, sort, page = 1, limit = 10 } = req.body;
  try {
    const query = {};
    if (username) query.username = { $regex: username, $options: 'i' };
    if (account) query.account = { $regex: account, $options: 'i' };
    if (role) query.role = role;

    const sortObj = sort ? { [sort.split(':')[0]]: parseInt(sort.split(':')[1] || 1) } : { username: 1 };

    const users = await User.find(query)
      .select('-password')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await User.countDocuments(query);

    res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to fetch users', error: err.message });
  }
});

// Export users to Excel
router.post('/export', auth, restrictToAdmin, async (req, res) => {
  const { username, account, role } = req.body;
  try {
    const query = {};
    if (username) query.username = { $regex: username, $options: 'i' };
    if (account) query.account = { $regex: account, $options: 'i' };
    if (role) query.role = role;

    const users = await User.find(query).select('-password').lean();

    const columns = [
      { key: 'username', header: 'Username', width: 20 },
      { key: 'account', header: 'Email/ID', width: 25 },
      { key: 'role', header: 'Vai trò', width: 15 },
    ];

    const filename = `users_export_${Date.now()}.xlsx`;
    const outputDir = path.join(__dirname, '../Exports');
    const filePath = await exportToExcel(users, columns, filename, outputDir);

    res.json({ status: true, url: `/Exports/${filename}` });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to export users', error: err.message });
  }
});

// Import users from Excel
router.post('/import', auth, restrictToAdmin, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      throw new Error('No file uploaded');
    }

    const headerMap = {
      username: ['username', 'tên người dùng'],
      account: ['account', 'email', 'tài khoản'],
      password: ['password', 'mật khẩu'],
      role: ['role', 'vai trò'],
    };

    const validateRow = async (row, headers) => {
      const username = row[headers.username]?.toString().trim() || '';
      const account = row[headers.account]?.toString().trim() || '';
      const password = row[headers.password]?.toString().trim() || '';
      const role = row[headers.role]?.toString().trim() || 'lecturer';

      if (!username || !account || !password) {
        throw new Error('Missing required fields');
      }
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$|^[A-Z0-9]{5,10}$/.test(account)) {
        throw new Error(`Invalid account format: ${account}`);
      }
      if (password.length < 6) {
        throw new Error(`Password too short: ${password}`);
      }
      if (!['admin', 'lecturer'].includes(role)) {
        throw new Error(`Invalid role: ${role}`);
      }

      const existingUser = await User.findOne({ account });
      if (existingUser) {
        throw new Error(`Account ${account} already exists`);
      }

      return { username, account, password, role };
    };

    const { validItems: validUsers, errors } = await processExcelFile(req.files.file.data, headerMap, validateRow, {
      batchSize: 500,
    });

    if (!validUsers.length && !errors.length) {
      throw new Error('No valid users found in Excel file');
    }
    if (!validUsers.length) {
      return res.status(400).json({ status: false, message: 'No valid users to import', errors });
    }

    await User.insertMany(validUsers);
    res.json({ status: true, message: `Imported ${validUsers.length} users successfully` });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message, errors: [] });
  }
});

module.exports = router;