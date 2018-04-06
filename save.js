const puppeteer = require('puppeteer'); // v 1.1.0
const { URL } = require('url');
const fse = require('fs-extra'); // v 5.0.0
const path = require('path');
const wkhtmltopdf = require('wkhtmltopdf');
const tmp = require('tmp');

const paperDPI = 135
const paperWidth = 8.27 * paperDPI
const paperHeight = 11.69 * paperDPI

async function downloadAndSavePDF(urlToFetch, tmpPath) {
  /* 1 */
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({width: Math.round(paperWidth), height: Math.round(paperHeight)})

  /* 2 */
  page.on('response', async (response) => {
    const url = new URL(response.url());
    let filePath = path.resolve(`${tmpPath}/${url.pathname}`);
    if (path.extname(url.pathname).trim() === '') {
      filePath = `${filePath}/index.html`;
    }
    await fse.outputFile(filePath, await response.buffer());
  });

  /* 3 */
  await page.goto(urlToFetch, {
    waitUntil: 'networkidle2'
  });

  await page.evaluate(() => {
    if (window.jQuery) {  
      $('*').trigger('unveil')
    }
  })

  setTimeout(async () => {
      await page.evaluate(() => {
        var scripts = document.getElementsByTagName('script');
        for (var i = (scripts.length-1); i >= 0; i--) {
          scripts[i].parentNode.removeChild(scripts[i]);
        }
      })
      await page.evaluate((paperWidth) => {
        $('.svg-visualization').each((idx, elem) => {
          var oldWidth = parseInt(elem.getAttribute('width'))
          var oldHeight = parseInt(elem.getAttribute('height'))
          var newWidth =  0.9 * paperWidth
          var newHeight = newWidth/oldWidth * oldHeight
          elem.setAttribute("width", newWidth)
          elem.setAttribute("height", newHeight)
        })
      }, paperWidth)
      outerHTML = await page.evaluate(() => document.documentElement.outerHTML);
      outerHTML = await outerHTML.replace(/href="\//g, "href=\"").replace(/href='\//g, "href=\'").replace(/src="\//g, "src=\"").replace(/src='\//g, "src=\'").replace(/^.*<script.*$/mg, "")
      outerHTML = await outerHTML.replace(/class="svg-visualization"/g, "")
      await fse.outputFile(`${tmpPath}/index.html`, outerHTML) 
      await browser.close();
      await wkhtmltopdf(`file://${tmpPath}/index.html`, {output: process.argv[3]})
  }, 10000)

}

tmp.dir( { unsafeCleanup : true }, function onTempDirCreated( error, tmpPath, cleanupCallback ) {
  console.log(tmpPath)
  downloadAndSavePDF(process.argv[2], tmpPath)
})
