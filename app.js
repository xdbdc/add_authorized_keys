import Koa from 'koa'
import Router from 'koa-router'
import views from 'koa-views'
import request from 'request'
import bodyParser from 'koa-bodyparser'
import fs from 'fs'
import path from 'path'
const port = 3000;
const app = new Koa()
const router = new Router()

const client_id = 'e2ac1e8fba3c7ac98316'
const client_secret = 'ae2a51affcc57dbe3e24200ef4c719573df39296'
const get_access_token_url = 'https://github.com/login/oauth/access_token?client_id='
const get_user_info_url = 'https://api.github.com/user?access_token='
const access_token_reg = /access_token=(\w+)/

function requestPromise(url) {
  const options = {
    url: url,
    headers: {
      'User-Agent': 'xiao555'
    }
  }
  return new Promise(function (resolve, reject) {
    request(options, function(err, response, body) {
      if (err) reject(err);
      resolve(body);
    });
  });
}

app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.info(`${ctx.method} ${decodeURIComponent(ctx.url)} ${ctx.status} - ${ms}ms`);
});

app.use(bodyParser())

app.use(views(__dirname + '/views', {
  map: {
    html: 'nunjucks'
  }
}));

router
  .get('/', async (ctx, next) => {
    console.log('home')
    await ctx.render('index')
    ctx.status = 200
  })
  .get('/add_authorized_keys', async (ctx, next) => {
    const code = ctx.query.code
    if (!code) {
      return await ctx.render('message', {
        message: `
          Sorry, you do not have permission to come here.
        `
      })
    }
    const access_token = access_token_reg.exec(await requestPromise(`${get_access_token_url}${client_id}&client_secret=${client_secret}&code=${code}`))[1]
    const userinfo = JSON.parse(await requestPromise(`${get_user_info_url}${access_token}`))
    const userOrgs = JSON.parse(await requestPromise(userinfo.organizations_url))
    let flag = false
    userOrgs.map( element => {
      if (element.login === 'xdbdc') flag = true
    })
    if (flag) {
      await ctx.render('add_key')
      ctx.status = 200
    } else {
      await ctx.render('message', {
        message: `
          Sorry, you are not the memeber of our organization in Github!</br>
          If you want to join us, please join our QQ group: 661565883.
        `
      })
    }

  })
  .post('/add_key', async (ctx, next) => {
    try {
      let keys = ctx.request.body.keys
      let content = fs.readFileSync(path.resolve(__dirname, 'keys.cache'), 'utf-8')
      content += content ? '\n\n' + keys : keys
      console.log(content)
      await fs.writeFile(path.resolve(__dirname, 'keys.cache'), content, async err => {
        if (err) throw err
      });
      await ctx.render('message', {
        message: 'Add key success. Now you can use `ssh xdbdc@xdbdc.club` to login our cloud server'
      })
      ctx.status = 200
    } catch (e) {
      return await ctx.render('message', {
        message: e
      })
    }

  });

app
  .use(router.routes())
  .use(router.allowedMethods());
app.use(ctx => ctx.status = 404)

;(async () => {
  try {
    await app.listen(port, () => console.info(`Server started on port ${port}`))
  } catch(e) {
    console.error(e);
  }
})()

export default app
