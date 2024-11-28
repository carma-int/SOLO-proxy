const axios = require('axios');
const HttpProxyAgent = require('http-proxy-agent');

// Replace these with your Bright Data account credentials
const username = 'brd-customer-hl_0fd4f454-zone-paywall_proxy';
const password = 'za9fk8ku9ghg';
const port = 22225;

// The URL you want to access through the proxy
const targetUrl = 'http://lumtest.com/myip.json';

// Create a proxy URL and an HttpsProxyAgent instance
const proxyUrl = `http://${username}:${password}@zproxy.lum-superproxy.io:${port}`;
const proxyAgent = new HttpProxyAgent(proxyUrl);

// Create an axios instance with the custom HttpProxyAgent
const axiosInstance = axios.create({
  httpAgent: proxyAgent,
});

// Make a request using the proxy
axiosInstance.get(targetUrl)
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });

