const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://www.croma.com/vivo-y28e-5g-4gb-ram-64gb-breeze-green-/p/307891'; // Replace with the actual Croma product URL

(async () => {
    try {
        const response = await axios.get(URL);
        const $ = cheerio.load(response.data);
        
        // Extract the product title
        const title = $('meta[property="og:title"]').attr('content');
        if (title) {
            console.log('Product Title:', title);
        } else {
            console.log('Product title not found. The HTML structure may have changed.');
        }

        price = $('meta[property="og:description"]').attr('content'); // Extract price from the span
        console.log('price',price);
       
    
        // console.log('Price:₹13,499', price);

        // Extract the product image URL
        const imageUrl = $('img[data-testid="super-zoom-img-0"]').attr('data-src');
        if (imageUrl) {
            console.log('Product Image URL:', imageUrl);
        } else {
            console.log('Product image URL not found. The HTML structure may have changed.');
        }

        // Extract the rating
        const rating = $('div.cp-rating span').first().text().trim();
        if (rating) {
            console.log('Rating:', rating);
        } else {
            console.log('Rating not found. The HTML structure may have changed.');
        }

    } catch (error) {
        console.error('Error fetching the URL:', error);
    }
})();
