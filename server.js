
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// MySQL connection setup
// MySQL connection setup
const connection = mysql.createConnection({
    host: 'autorack.proxy.rlwy.net', // the correct host
    user: 'root',                    // your MySQL user
    password: 'EpMoZliHhYeVIEOCoDlEAwzQwQDGVHin',  // your MySQL password
    database: 'railway',             // your database name
    port: 14185                      // the port Railway is using
});



// Connect to MySQL
connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err.stack);
        return;
    }
    console.log('Connected to MySQL');
});

// Helper function to get website name
const getWebsiteName = async (url) => {
    if (url.includes('amzn')) return 'Amazon';
    if (url.includes('flipkart')) return 'Flipkart';
    if (url.includes('meesho')) return 'Meesho';
    if (url.includes('snapdeal')) return 'Snapdeal';
    if (url.includes('croma')) return 'Croma';
    return 'Unknown';
};

// Helper function to scrape product details based on the URL domain
const scrapeProductDetails = async (url) => {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    let title, price, imageUrl;

    // Scraping logic for different websites
    if (url.includes('amzn')) {
        title = $('#productTitle').text().trim();
        price = $('.a-offscreen').first().text().trim();
        imageUrl = $('#landingImage').attr('src');
        if (!price) {
            const symbol = $('.a-price-symbol').first().text().trim();
            const wholePrice = $('.a-price-whole').first().text().trim();
            if (symbol && wholePrice) {
                price = `${symbol}${wholePrice}`;
            }
        }
    } else if (url.includes('flipkart')) {
        title = $('._35KyD6').text().trim();
        price = $('._1vC4OE._3qQ9m1').text().trim();
        imageUrl = $('._3BTv9X').find('img').attr('src');
    } else if (url.includes('meesho')) {
        title = $('span.sc-eDvSVe.fhfLdV').text().trim();
        price = $('h4.sc-eDvSVe.biMVPh').text().trim();
        imageUrl = $('div.ProductDesktopImage__ImageWrapperDesktop-sc-8sgxcr-0 img').attr('src');
    } else if (url.includes('snapdeal')) {
        title = $('h1[itemprop="name"]').text().trim();
        price = $('span[itemprop="price"]').text().trim();
        imageUrl = $('img[bigsrc]').attr('bigsrc');
    } else if (url.includes('croma')) {
        title = $('meta[property="og:title"]').attr('content');
        price = Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;
        imageUrl = $('img[data-testid="super-zoom-img-0"]').attr('data-src');
    } else {
        throw new Error('Unsupported website');
    }

    if (!title || !price || !imageUrl) {
        throw new Error('Failed to extract product details');
    }

    const websiteName = await getWebsiteName(url);

    console.log('Scraped product details:', { title, price, imageUrl, websiteName, url });
    return { title, price, imageUrl, websiteName, url };
};

// Route to scrape product details

app.get('/scrape', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    try {
        const productDetails = await scrapeProductDetails(url);
        res.json(productDetails);
    } catch (error) {
        console.error('Error scraping product:', error.message);
        res.status(500).json({ error: "Failed to fetch product details" });
    }
});

// Route to add product to cart
app.post('/add-to-cart', (req, res) => {
    const { title, price, imageUrl, websiteName, url } = req.body;
    console.log('Received data for adding to cart:', req.body);

    if (!title || !price || !imageUrl || !websiteName || !url) {
        console.error('Missing product details:', req.body);
        return res.status(400).json({ error: "Missing product details" });
    }

    // Store product in the cart
    connection.query(
        'INSERT INTO cart (title, price, imageUrl, websiteName, url) VALUES (?, ?, ?, ?, ?)',
        [title, price, imageUrl, websiteName, url],
        (err, result) => {
            if (err) {
                console.error('Error adding product to cart:', err);
                return res.status(500).json({ error: 'Failed to add product to cart' });
            }
            console.log('Product added to cart successfully');
            res.json({ success: true });
        }
    );
});

// Route to fetch cart items
app.get('/cart', (req, res) => {
    const sortOrder = req.query.sort === 'desc' ? 'DESC' : 'ASC';

    connection.query(
        `SELECT * FROM cart ORDER BY CAST(REPLACE(REPLACE(price, '₹', ''), ',', '') AS DECIMAL(10, 2)) ${sortOrder}`,
        (err, results) => {
            if (err) {
                console.error('Error fetching sorted cart items:', err);
                return res.status(500).json({ error: 'Failed to fetch cart items' });
            }
            console.log('Fetched sorted cart items:', results);
            res.json(results);
        }
    );
});

// Route to delete a product from the cart
app.delete('/delete-from-cart/:id', (req, res) => {
    const productId = req.params.id;

    connection.query('DELETE FROM cart WHERE id = ?', [productId], (err, result) => {
        if (err) {
            console.error('Error deleting product from cart:', err);
            return res.status(500).json({ error: 'Failed to delete product from cart' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        console.log('Product deleted from cart successfully');
        res.json({ success: true });
    });
});

// Route to get cart items as a shareable text
app.get('/share-cart', (req, res) => {
    connection.query('SELECT * FROM cart', (err, results) => {
        if (err) {
            console.error('Error fetching cart items for sharing:', err);
            return res.status(500).json({ error: 'Failed to fetch cart items' });
        }

        let message = 'Shopping Cart:\n';
        results.forEach((item, index) => {
            message += `${index + 1}. ${item.title}\nPrice: ${item.price}\nWebsite: ${item.websiteName}\nURL: ${item.url}\n\n`;
        });

        res.json({ message });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});