import RestException from '@rc-ex/core/lib/RestException';
const createApp = require('ringcentral-chatbot/dist/apps').default;
const {createAsyncProxy} = require('ringcentral-chatbot/dist/lambda');
const serverlessHTTP = require('serverless-http');
const axios = require('axios');

const handle = async (event: any) => {
  const {type, text, group, bot} = event;
  if (type === 'Message4Bot') {
    if (text === 'ping') {
      await bot.sendMessage(group.id, {text: 'pong'});
    } else if (text.startsWith('[code]') && text.endsWith('[/code]')) {
      let code = text.trim().substring(6).trim();
      code = code.substring(0, code.length - 7).trim();
      let obj: any;
      try {
        obj = JSON.parse(code);
      } catch (e) {
        await bot.sendMessage(group.id, {
          text: 'The code your shared is not a valid JSON object',
        });
        return;
      }
      if (obj.type !== 'AdaptiveCard') {
        await bot.sendMessage(group.id, {
          text: 'The JSON your shared is not for Adaptive Cards',
        });
        return;
      }
      try {
        await bot.sendAdaptiveCard(group.id, obj);
      } catch (e) {
        await bot.sendMessage(group.id, {
          text: `We got an exception when trying to render the Adaptive Card: [code]${JSON.stringify(
            (e as RestException).response.data,
            null,
            2
          )}[/code]`,
        });
        (e as RestException).message;
      }
    } else {
      await bot.sendMessage(group.id, {
        text: 'Please share me a code snippet of an Adaptive Card and I will render it for you',
      });
    }
  }
};
const app = createApp(handle);
module.exports.app = serverlessHTTP(app);
module.exports.proxy = createAsyncProxy('app');
module.exports.maintain = async () =>
  axios.put(
    `${process.env.RINGCENTRAL_CHATBOT_SERVER}/admin/maintain`,
    undefined,
    {
      auth: {
        username: process.env.RINGCENTRAL_CHATBOT_ADMIN_USERNAME,
        password: process.env.RINGCENTRAL_CHATBOT_ADMIN_PASSWORD,
      },
    }
  );
