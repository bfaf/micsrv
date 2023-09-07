const win = require('win-audio');

const {transports, createLogger, format} = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const MB1 = 1 * 1024 * 1024;

const logOptions = { filename: 'micsrv.log', maxsize: MB1, maxFiles: 5 };

const log = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json(),
  ),
  defaultMeta: { service: 'micsrv' },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File(logOptions),
  ],
});
log.configure({
    level: 'info',
    transports: [
      new DailyRotateFile(logOptions),
    ]
});

const mic = win.mic;

const express = require('express');
const app = express();

let requestCounter = 0;
const MAX_REQUESTS_PER_SECOND = 3;

const exitIfHasTooManyRequests = () => {
    const t = setTimeout(() => {
        if (requestCounter >= MAX_REQUESTS_PER_SECOND)
        {
            log.info(`Reveived to many requests: ${requestCounter}. Exiting`);
            process.exit(1);
        }
        else
        {
            requestCounter = 0;
            clearTimeout(t);
        }
    }, 1000);
}

const logIpAddress = (method, req) => {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    log.info(`Received request for ${method} from ${ip}`);
}

app.get('/state', function (req, res) {
  logIpAddress('state', req);
  requestCounter++;
  exitIfHasTooManyRequests();
  res.json(mic.isMuted() ? { isMuted: 1 } : { isMuted: 0 });
});

app.put('/switch', function (req, res) {
    logIpAddress('switch', req);
    requestCounter++;
    exitIfHasTooManyRequests();
    if (mic.isMuted())
    {
        mic.unmute();
    }
    else 
    {
        mic.mute();
    }
    const state = mic.isMuted() ? 'muted' : 'unmited';
    log.info(`Mic switched to ${state}`);
    res.sendStatus(200);
  });

app.listen(3000, () => { log.info('Server started'); });
