import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// self signed ssl cert for static serving of browser test files (because esmodules in browser require https)
const https = {
  cert: '-----BEGIN CERTIFICATE-----\nMIIDazCCAlOgAwIBAgIUd8cO2bV2jeCmJyZPFZB6+niw8JIwDQYJKoZIhvcNAQEL\nBQAwRTELMAkGA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM\nGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yNTA3MjAwOTM2MTBaFw0zNTA3\nMTgwOTM2MTBaMEUxCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw\nHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB\nAQUAA4IBDwAwggEKAoIBAQDCpkFutc5W2OvNqVv6uTt0fGMK+txrunQdIv8j5RpV\nv6cCbnziMm2zf/e27k/BpFLHJyGsHls12zyb6rRiAauWQys8sGXrPQXO8PMdQ/5R\nlCGUAnw0dOEe3lxjM7THB7162Nr6SVTM/8UERpBM4dfNqlE5s/2ymmbTQLKU9R3P\nVhdfV24hokNHNTeLthSTKOrqT3feUFQwvb617DLzcE494v1sGgl2HcYZ4fDhDprt\n3EcBPS8QR0IE9nJ6YasAf7bFz6fw7/g8Imxv0bA5FQXOCm/iIdNnWuDoWXZVrb4S\nfqXycoKlnS6cti+VW05QgO9o8fu5QAY1lGKC3cZQ/Lr3AgMBAAGjUzBRMB0GA1Ud\nDgQWBBTLlM2aCl6vDb6AzR7ce8kiQ1VOCDAfBgNVHSMEGDAWgBTLlM2aCl6vDb6A\nzR7ce8kiQ1VOCDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBT\n7G3HXPydMyG/W+YSEP964t6hXnl/jAsIoCsY+h1zXvRiZ+4eXMqUZdTjnVoLUGOQ\nfkKmYOUMrYbBcxhqkwIg25/Ma5QITYWs9z3SC9ngKDqnaLi0zcKVhdZAawEL4EYH\nMkOOF8e8hKKo2wHHlBLFSO/oihq0y51p0v8DG/o7B2Tt6bxfnrTTlumeYIgUQuUu\nNzGUBKN6L9FxfqLoidI3gRrlGcNt4PLR2piNm1sqxxyzfucXSVR3Gj4ScpP3QuIZ\nwPwki3XMHJSezpF+QKnujJ9DohY65LyJlTLXR23vFqcLKiuj9tihYDbw7zIkSwZr\nAz9P/IO/1NOj8ikDE9Ya\n-----END CERTIFICATE-----\n',
  key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCpkFutc5W2OvN\nqVv6uTt0fGMK+txrunQdIv8j5RpVv6cCbnziMm2zf/e27k/BpFLHJyGsHls12zyb\n6rRiAauWQys8sGXrPQXO8PMdQ/5RlCGUAnw0dOEe3lxjM7THB7162Nr6SVTM/8UE\nRpBM4dfNqlE5s/2ymmbTQLKU9R3PVhdfV24hokNHNTeLthSTKOrqT3feUFQwvb61\n7DLzcE494v1sGgl2HcYZ4fDhDprt3EcBPS8QR0IE9nJ6YasAf7bFz6fw7/g8Imxv\n0bA5FQXOCm/iIdNnWuDoWXZVrb4SfqXycoKlnS6cti+VW05QgO9o8fu5QAY1lGKC\n3cZQ/Lr3AgMBAAECggEAKRdF2uRAce8LIHhvNWejGH0lv2yj2Y4b8wavS9mSjKWP\n0SCX9nxk0i7ikViPt7ZDz00Ae8BQyvbEPbn3aHUnzunRF9e5PEa+kiglenkfGAOo\nbwFzTPObjpOsdzi0IgwNQQDEgW+3misoYTWwQrqufvlEemT32ptjt5cB3BY+u8T3\nKZ5gmNaCPN1Uo5Al29j4RJMM0HjSctaVP1i/ALReO4fpF5Ll2aYz2E9q0I75GC8Z\n54n9eeGuZAgcwBxu2G+MwaVhBCm5fie1TVC82PqxyOWD8/Y74HBSgN0AY4WIe4sZ\n0oT7zAzq65eMtOuxRfLtdfDpIYwnnyQZSrJwhdJHuQKBgQD2GFK0JzLW46G64IkX\nOQdNZIEriuyf9hIxfOZPi/MfXLQrGbm6uPochEKAzbokAv0ySULGiYNMP54OjhmJ\nBU3qkD+dKXpr6zVFSLQU4yp0ijC16rtQlxAiWmBWTo5wVBnNbIC41qlqTPtFF0/M\noEELmaacAzCkzD2PCMRcvNDKhQKBgQDKe9r1nKywJJjherMiZZHgLok8G1RnIVHA\nS2W7Qtz1veS9RiU3lJi1Uyu7M4yJlbtZNTa6+1Fl5APn8YPTqDdYY+5ATPNJquzU\ndXp+KQ2Uu5n70AVZvcQX4zE5VNI3gDEe9KgCAPkm6KMFpbDyCBoUPJIrBbts+IuS\niEvxNO+uSwKBgQCCnaZHuAZjx62vYj1g9gPKL+3fDn1I6XH+kiwrTDxeCPYXajAJ\nyuP0/r3NX2PMeUmpxviKJ7JoZdueHg2vjAEu3iDlaX5wiQZdH5l0/J0r/ayc4VlK\nDOOjWBSJumgfdoO7ZDtt34FLylAS+6x/Dw92+LZVV9wZm82QfTa7gfvPgQKBgQCu\nO39BA20RMJygwR0thurMVh7eqsGo8GHRLs++IB3UE2+lcpuJxQLWXFfwAL54kXAh\npgmPQbxcCaVWy1pdIY1mMK8Ng2mBRWP+uYwKzTaTeg5ZQTmpbAI1b9imdZdiDJu4\nAFwlRUMfOOU2ccndqh0OtsQr4wXREdm/4CpAxwVLGwKBgFGj36enDGB2O4DKGiIl\nAgoEapAeMmdmKbE9Ws149kGaDMkthGcuni7L+uPv9WaCS0TBbC7pDLCIDMs5R1j9\n8R1mnFc6PdzBx8FsCB7Loa1WR2TUM9jdffeo9BavdEbBUxsHoDCEM6UXAw1R4kvL\nBm399pzkBEupD+0Ox8j5q+Y5\n-----END PRIVATE KEY-----\n',
};

// serve static files from working dir over ssl
const server = fastify({ logger: true, https });
server.register(fastifyStatic, { root: process.cwd() });
const address = await server.listen();

// open test page
const url = `${address}/003-browser.test.html`;
console.log('Launching puppeteer...');
const browser = await puppeteer.launch({ acceptInsecureCerts: true, timeout: 0 });
console.log('Opening new page...');
const page = await browser.newPage();
console.log(`Navigating to: ${url}`);
await page.goto(url, { waitUntil: 'load', timeout: 0 });
console.log('Page loaded...waiting for tests');

// wait for page to load and tests to run
await sleep(15000);
console.log('Done waiting!');

await page.screenshot({
  path: 'screenshot.png',
});

// get and print mocha stats
const rawStats = await page
  .locator('#mocha-stats')
  .map(el => el.innerText)
  .wait()
;
const parsedStats = rawStats.match(/^\s*(?<symbol>\S+)\s+(?<rate>\d+%)\s+passes:\s+(?<pass>\d+)\s*failures: (?<fail>\d+)\s*duration: ([\dms.]+)\s*$/);
console.dir(parsedStats?.groups ?? rawStats);

// exit with fail code if tests failed
if (parsedStats?.groups?.rate != '100%' || parsedStats?.groups?.fail != '0') process.exit(1);
else console.log(`success with ${parsedStats.groups.pass} tests passing!`);

await browser.close();

server.close();
