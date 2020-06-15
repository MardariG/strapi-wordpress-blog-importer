'use strict';

/**
 * WpImporter.js controller
 *
 * @description: A set of functions called "actions" of the `wp-importer` plugin.
 */
const xml2js = require('xml2js');
const rimraf = require('rimraf');
const stripPrefix = xml2js.processors.stripPrefix;

module.exports = {

  /**
   * Default action.
   *
   * @return {Object}
   */

  import: async (ctx) => {
    // Add your own logic here.
    // Extract optional relational data.
    const {files} = ctx.request.files;
    if (!files || files.type !== 'text/xml') return;
    // Transform stream files to buffer
    const [buffer] = await strapi.plugins.upload.services.upload.bufferize(files);
    const xmlString = buffer.buffer.toString('utf8');
    const parsedJson = await xml2js.parseStringPromise(xmlString,
      {
        tagNameProcessors: [stripPrefix],
        attrNameProcessors: [stripPrefix],
        explicitArray: false
      });
    const data = parsedJson.rss;

    const authors = await strapi.plugins['wp-importer'].services.wpimporter.persistBlogAuthors(data.channel.author);

    await Promise.all(data.channel.item
      .filter(p => p.post_type === 'post' || p.post_type === 'news')
      .map(post => new Promise(async (resolve, reject) => {
        const {title, slug, encoded, creator, status, link, postmeta, post_date_gmt, post_type} = post;
        const postData = {
          title,
          content: [],
          slug,
          link,
          published_at: post_date_gmt,
          post_type: post_type === 'post' ? 'BLOG' : 'NEWS', // HACK
          author: authors.find(value => value.email === creator),
          status: status === 'publish' ? 'PUBLISHED' : 'DRAFT',
          seo: {
            title,
            description: encoded[1].replace(/<\/?[^>]+(>|$)/g, '')
          }
        };

        function attributeNameToLowerCase(name) {
          return name.toLowerCase()
        }

        const processedEncoded = encoded[0]
          .replace(/<div class="summary-item-list-container sqs-gallery-container">([\S\s]*)/gm, "")
          .replace(/<div([\S\s]*?)>/gm, "")
          .replace(/<\/div>/gm, "")
          .replace(/<figure([\S\s]*?)>/gm, "")
          .replace(/<\/figure>/gm, "")
          .replace(/class="([\S\s]*?)"/gm, "")
          .replace(/<noscript>([\S\s]*?)<\/noscript>/gm, "")
          .replace(/data-image="([\S\s]*?)"/gm, "")
          .replace(/data-test="([\S\s]*?)"/gm, "")
          .replace(/style="([\S\s]*?)"/gm, "");
        // console.log(processedEncoded);
        try {
          const parsedJson2 = await xml2js.parseStringPromise(`<div> ${processedEncoded} </div>`,
            {
              // tagNameProcessors: [tagNameProcessors],
              // valueProcessors : [tagValueProcessors],
              // attrValueProcessors: [skipAttributes],
              attrNameProcessors: [attributeNameToLowerCase],
              explicitRoot: false,
              explicitArray: false,
              trim: true,
              normalizeTags: true,
              // normalize: true,
              charsAsChildren: true,
              explicitChildren: true,
              preserveChildrenOrder: true,
              strict: false,
              headless: true
            });

          postData.content = await strapi.plugins['wp-importer'].services.wpimporter.formatContentData(parsedJson2);

          if (postmeta && postmeta.meta_key === '_thumbnail_id' && postmeta.meta_value) {
            const attachment = data.channel.item.find(p => p.post_type === 'attachment' && p.post_id === postmeta.meta_value);
            // console.log(attachment);
            if (attachment) {
              postData.cover = {
                picture: await strapi.plugins['wp-importer'].services.wpimporter.urlToFile(attachment.attachment_url),
                caption: encoded[1],
                link
              }
            }
          }


          await strapi.services['blog-post'].create(postData);
          resolve()
        } catch (err) {
          console.log(err);
          console.log('\n');
          console.log('------------------------------------------------------------------ ');
          console.log('\n');
          console.log(postData);
          reject(err)
        }
      })));
    await rimraf.sync('./public/uploads/tmp/*');
    // Send 200 `ok`
    ctx.send({message: 'ok'});
  }
};
