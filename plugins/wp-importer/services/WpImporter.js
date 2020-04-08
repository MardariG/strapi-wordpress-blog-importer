'use strict';

/**
 * WpImporter.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const fsPromise = require('fs').promises;
const urlParse = require('url');
const FileType = require('file-type');

const tempFolder = './public/uploads/tmp/';

class WpImporterService {

  constructor() {
    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder);
    }
  }

  async formatContentData(parsedJson2) {
    const blackListValues = ['[caption', '[/caption]'];

    function isAllowedValue(value) {
      return !!value && !blackListValues.some(v => value.includes(v))
    }

    function buildTagAttributes(obj) {
      const tagName = obj['#name'];
      if (tagName === 'a') {
        return `${tagName} href="${obj.$.href}" target="${obj.$.target}"`;
      }
      return tagName;
    }

    function formatChildren(obj, currentHtml = '') {
      const tagName = obj['#name'];

      if (tagName === '__text__') {
        if (isAllowedValue(obj._)) {
          currentHtml = obj._;
        }
      } else {
        if (obj[children]) {
          currentHtml = `<${buildTagAttributes(obj)}>${obj[children].map(ch => formatChildren(ch, currentHtml)).join('')}</${tagName}>`
        } else {
          currentHtml = `<${buildTagAttributes(obj)}> </${tagName}>` /* strange method for creating spaces */
        }
      }
      return currentHtml;
    }

    const addContent = () => {
      if (localContent) {
        content.push({__component: "blog.rich-text", rich_text: localContent});
        localContent = '';
      }
    };

    function toQuote(obj) {
      return {
        __component: "blog.quote",
        quote: formatChildren(obj)
      }
    }

    const children = '$$';
    const content = [];
    let localContent = '';
    for (const obj of parsedJson2[children]) {
      const type = obj['#name'];

      if (type === 'img') {
        addContent();
        content.push(await this.toImage(obj))
      } else if (type === 'a' && obj.img) { /* a tag has nested image */
        addContent();
        content.push(await this.toImage(obj.img, obj.$.href))
      } else if (type === 'blockquote') {
        addContent();
        content.push(toQuote(obj))
      } else if (type === 'div') {
        // Actually in my case this are not related posts, but latest 10 posts, no need to map them.
      } else {
        localContent += formatChildren(obj, localContent);
      }
    }

    return Promise.all(content);
  }

  async toImage(obj, imageClickLink) {
    return {
      __component: "nested.slide",
      picture: await this.urlToFile(obj.$.src),
      caption: obj.$.alt,
      link: imageClickLink
    }
  }

  async urlToFile(url) {
    const downloaded = await this.download(url);
    return this.upload(downloaded);
  }

  async download(url) {
    const parsedUrl = urlParse.parse(url);
    url = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
    // get the filename such as `image01.jpg`
    const name = Math.random().toString(36).substring(2, 15) + path.basename(url);
    // we need to set a file path on our host where the image will be
    const filePath = `${tempFolder}/${name}`;

    // create an instance of fs.writeStream
    const writeStream = fs.createWriteStream(filePath);
    // make a GET request and create a readStream to the resource
    const {data} = await axios.get(url, {responseType: 'stream', timeout: 60 * 60 * 60}); /* some images responses exceeds timeout */

    // pipe the data we receive to the writeStream
    data.pipe(writeStream);
    // return a new Promise that resolves when the event writeStream.on is emitted. Resolves the file path
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve(filePath)
      });
      writeStream.on('error', reject);
    });
  }

  async upload(imgPath) {
    // name of the file like image01.jpg
    const name = path.basename(imgPath);
    // read contents of file into a Buffer
    const buffer = await fsPromise.readFile(imgPath);
    const {mime, ext} = await FileType.fromBuffer(buffer); /* some image links do not have an extension */
    // get the buffersize using service function from upload plugin
    const buffers = await
      strapi.plugins.upload.services.upload.bufferize({
        path: imgPath,
        name: name + '.' + ext,
        ext,
        type: mime,
        size: buffer.toString().length
      });
    // pass the `buffers` variable to the service function upload which
    // returns a promise that gets resolved upon upload
    // provider = aws-s3 || local
    const uploadService = strapi.plugins.upload.services.upload;

    // Retrieve provider configuration.
    const config = await uploadService.getConfig();
    // config.path = '/318'
    return strapi.plugins.upload.services.upload.upload(
      buffers, config
    );
  }

}

module.exports = new WpImporterService();
