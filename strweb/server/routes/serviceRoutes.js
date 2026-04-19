const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../src/middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Импортируем наши модели
const Service = require('../src/models/Service');
const ServiceCategory = require('../src/models/ServiceCategory');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// POST /api/services/:id/photos
router.post('/services/:id/photos', upload.single('photo'), async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ message: 'Услуга не найдена' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Файл не был загружен' });
        }

        const newPhoto = {
            url: `/uploads/${req.file.filename}`,
            caption: req.body.caption || 'Новое фото',
        };

        service.photoGallery.push(newPhoto);
        await service.save();

        res.status(201).json(service);

    } catch (err) {
        console.error('File Upload Error:', err);
        res.status(500).json({ message: 'Ошибка сервера при загрузке файла' });
    }
});


// @route   GET api/services
// @desc    Получить все услуги
// @access  Public
router.get('/services', async (req, res) => {
    try {
        let sortOptions = {};
        const sortBy = req.query.sort;

        if (sortBy === 'price_asc') {
            sortOptions = { price: 1 };
        } else if (sortBy === 'price_desc') {
            sortOptions = { price: -1 };
        } else if (sortBy === 'duration_asc') {
            sortOptions = { duration_minutes: 1 };
        } else if (sortBy === 'duration_desc') {
            sortOptions = { duration_minutes: -1 };
        }

        const services = await Service.find().populate('category').sort(sortOptions);
        res.json(services);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/services
// @desc    Создать новую услугу
// @access  Private (Admin)
router.post('/services', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const { name, description, price, duration_minutes, category, image } = req.body;
    try {
        const newService = new Service({
            name,
            description,
            price,
            duration_minutes,
            category,
            image
        });
        const service = await newService.save();
        res.status(201).json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/services/:id
// @desc    Обновить существующую услугу
// @access  Private (Admin)
router.put('/services/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const { name, description, price, duration_minutes, category, image} = req.body;
    try {
        let service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ msg: 'Service not found' });

        service = await Service.findByIdAndUpdate(
            req.params.id,
            { $set: { name, description, price, duration_minutes, category, image } },
            { new: true }
        );
        res.json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/services/:id
// @desc    Удалить услугу
// @access  Private (Admin)
router.delete('/services/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        let service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ msg: 'Service not found' });

        await Service
            .findByIdAndDelete(req.params.id);
        res.json({ msg: 'Service removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/categories
// @desc    Получить все категории услуг
// @access  Public
router.get('/categories', async (req, res) => {
    try {
        const categories = await ServiceCategory.find();
        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/services/:id
// @desc    Получить услугу по ID
// @access  Public
router.get('/services/:id', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id).populate('category');

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        res.json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;