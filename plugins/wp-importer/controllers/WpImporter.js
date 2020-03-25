'use strict';

/**
 * WpImporter.js controller
 *
 * @description: A set of functions called "actions" of the `wp-importer` plugin.
 */
const xml2js = require('xml2js');
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
    const {files = {}} = ctx.request.files || {};
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
    const authors = [];
    for (const author of data.channel.author) {
      const {author_email, author_first_name, author_last_name, author_display_name} = author;
      const username = author_display_name.split(' ').join('');
      let user = await strapi.plugins['users-permissions'].services.user.fetch({username});
      if (user) {
        authors.push(user);
      } else {
        authors.push(await strapi.plugins['users-permissions'].services.user.add({
          username,
          email: author_email,
          firstName: author_first_name,
          lastName: author_last_name,
        }));
      }
    }
    await Promise.all(data.channel.item
      .filter(p => p.post_type === 'post')
      .map(post => new Promise(async (resolve, reject) => {
        const {title, slug, encoded, pubDate, creator, status, link, postmeta} = post;
        const postData = {
          title,
          content: [],
          excerpt: encoded[1],
          slug,
          link,
          created_at: pubDate,
          author: authors.find(value => value.email === creator),
          status: status === 'publish' ? 'PUBLISHED' : 'DRAFT',
        };

        const ignoreAttributes = ['class', 'style'];

        function skipAttributes(value, name) {
          if (ignoreAttributes.includes(name)) {
            return undefined;
          }
          return value
        }
        function attributeNameToLowerCase( name) {

          return name.toLowerCase()
        }


        try {
          const parsedJson2 = await xml2js.parseStringPromise(`<div> ${encoded[0]} </div>`,
            {
              attrValueProcessors: [skipAttributes],
              attrNameProcessors: [attributeNameToLowerCase],
              explicitRoot: false,
              explicitArray: false,
              trim: true,
              normalizeTags: true,
              // normalize: true,
              charsAsChildren: true,
              explicitChildren: true,
              preserveChildrenOrder: true,
              strict: false
            });

          postData.content = await strapi.plugins['wp-importer'].services.wpimporter.formatContentData(parsedJson2);

          if (postmeta && postmeta.meta_key === '_thumbnail_id' && postmeta.meta_value) {
            const attachment = data.channel.item.find(p => p.post_type === 'attachment' && p.post_id === postmeta.meta_value);
            if (attachment) {
              postData.cover = await strapi.plugins['wp-importer'].services.wpimporter.urlToFile(attachment.attachment_url)
            }
          }

          await strapi.services['blog-post'].create(postData);
          resolve()
        } catch (err) {
          console.log(err);
          reject(err)
        }
      })));

    // Send 200 `ok`
    ctx.send({message: 'ok'});
  }
};
