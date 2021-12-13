// 四个基础功能
// 路由管理、静态资源托管、HTTP、store
const http = require('http');//http模块
const url = require('url');//解析字符串
const path = require('path');//处理路径
const fs = require('fs');//包括读取文件，读写流等
const qs = require('querystring');//路径处理
const multiparty = require('multiparty');//处理multiparty/form-data格式数据

const PORT = 8080;

const notFound = (req,res)=>{
    fs.readFile(path.join(__dirname,'404.html'),(err,data)=>{
        if(err){
            res.write(404,'not found');
        }else{
            res.writeHead(404,{'Content-Type':"text/html;charset='utf-8'"})
            res.write(data)
            res.end();
        }
    })
}

//往文件里写入数据
const writeDb = (chunk)=>{
    fs.appendFile(path.join(__dirname,'db'),chunk,err=>{
        if(err) throw err;
        console.log('db insert',chunk && chunk.toString());
    })
}

http.createServer((req,res)=>{
    // 获取请求url
    // req.url 接收到的是字符串形式，需解析
    let url = req.url;
    let pathName = url.parse(url).pathname;

    //处理http GET/POST
    //  GET   /api?a=1&b=2
    if(pathName.startsWith('/api')){
        // 获取请求的method
        const method = req.method;
        if(method === 'GET'){
            const query = qs.parse(url.parse(url).query) //a=1&b=2 => { a: '1', b: '2' }
            console.log(query);
            const reqData = {
                code:200,
                msg:'success',
                data:query
            }
            res.end(JSON.stringify(reqData));//对js对象序列化
            return;//防止进入其他路径
        }
        /*
            通过req.headers['content-type']获取请求的数据格式，如果是applicatin/json则进入下面的逻辑。
            创建postData变量，用来存储post数据。
            在接收数据流的时候，会不断触发request的data事件，postData持续累积数据。
            当数据流接收完毕，会触发request的end事件，返回给客户端最终结果。

            如果是form-data
            1.为何使用contentType.indexOf('multipart/form-data') !== -1来判断是不是multipart/form-data类型？
                因为通过form-data提交的数据content-type的值是类似
                multipart/form-data; boundary=--------------------------746178952166722288450591
                的形式，因此使用indexOf()。
            2.let form = new multiparty.Form()可方便的解析form-data数据。fields里可以获取提交的数据变量及值，files里获取提交的文件数据。
            3.使用JSON.stringify()将对象转化为JSON字符串返回给客户端。
        */
        if(method === 'POST'){
            // 告知服务器请求文件类型
            const contentType = req.headers['content-type'];
            console.log(contentType);
            if(contentType === 'application/json'){
                let postData = '';
                // 二进制流方式传输，直到流传输结束
                // chunk是原始二进制数据，需要转化成字符串
                req.on('data',chunk => {
                    postData += chunk.toString();
                    writeDb(chunk);
                })
                req.on('end',()=>{
                    res.end(postData);
                })
            }else if(contentType.indexOf('multipart/form-data')>-1){
                let form = new multiparty.Form();
                form.parse(req,(err,fields,files)=>{
                    res.end(JSON.stringify({fields:fields,files:files}))
                })
            }
            return;
        }
    }

    //当路由是根目录的情况 如localhost:8080，做一次路由拼接转发
    if(pathName === '/'){
        pathName = path.join(__dirname,'index.html');
    }
    //判断路由文件后缀名
    const extName = path.extname(pathName);
    if(extName === '.html'){
        //文件读取处理
        fs.readFile(pathName,(err,data)=>{
            if(err){
                //404 => 404.html
                notFound(req, res);
            }else{
                res.writeHead(200,{'Content-Type':"text/html;charset='utf-8'"})
                res.write(data);
                res.end();
            }
        })
    }

    // res.write('hello world');
    // res.end();
}).listen(PORT);