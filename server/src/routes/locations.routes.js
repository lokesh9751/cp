import express from 'express';
import { Country, State } from 'country-state-city';

const router = express.Router();

// Cache countries in memory on startup
const cachedCountries = Country.getAllCountries()
    .map((c) => ({
        code: c.isoCode,
        name: c.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

router.get('/countries', (req, res) => {
    res.json({ countries: cachedCountries });
});

router.get('/states/:countryCode', (req, res) => {
    const code = String(req.params.countryCode || '').trim().toUpperCase();
    if (!code || code.length > 3) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Invalid country code' },
        });
    }

    const states = State.getStatesOfCountry(code)
        .map((s) => ({
            code: s.isoCode,
            name: s.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ states });
});

export default router;