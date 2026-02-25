const { Telegraf } = require('telegraf')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const Show = require('./functions')
let cont = require('./context');
require('dotenv').config()

const token = process.env.BOT_TOKEN
if (!token) {
    console.error('❌ Ошибка: токен bot не найден в .env')
    process.exit(1)
}

// Проверяем API ключ Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
    console.error('❌ Ошибка: токен GEMINI_API_KEY не найден в .env')
    process.exit(1)
}

// Инициализируем Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

const bot = new Telegraf(token)

// Создаем экземпляр класса и передаем ему bot
const show = new Show(bot)

// Команды
bot.start((ctx) => {
    ctx.reply('Здравствуйте!', {
        reply_markup: {
            keyboard: [
                ['❓ Вопросы и ответы', '🏥 О нас'],
                ['📋 Помощь', '🤖 Спросить ИИ']
            ],
            resize_keyboard: true
        }
    })
})

// Команды
bot.command('faq', (ctx) => show.Questions(ctx))
bot.command('about', (ctx) => show.About(ctx))
bot.command('help', (ctx) => show.Help(ctx))

// Команда для ИИ
bot.command('ai', async (ctx) => {
    const question = ctx.message.text.replace('/ai', '').trim()
    
    if (!question) {
        return ctx.reply('❓ Напиши вопрос после /ai\nНапример: /ai Как записаться к врачу?')
    }
    
    await askGemini(ctx, question)
})

// Обработка текстовых кнопок
bot.hears('❓ Вопросы и ответы', (ctx) => show.Questions(ctx))
bot.hears('🏥 О нас', (ctx) => show.About(ctx))
bot.hears('📋 Помощь', (ctx) => show.Help(ctx))
bot.hears('🤖 Спросить ИИ', (ctx) => {
    ctx.reply('🤖 Напишите ваш вопрос, и я отвечу!\nИли используйте команду /ai')
})

// Функция для запросов к Gemini
async function askGemini(ctx, question) {
    try {
        await ctx.sendChatAction('typing')
        
        // Пробуем разные модели по порядку
        const models = [
            'gemini-3-flash-preview'
        ]
        
        let response = null
        let lastError = null
        
        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName })
                const result = await model.generateContent([cont, question])
                response = await result.response.text()
                console.log(`✅ Использована модель: ${modelName}`)
                break
            } catch (e) {
                lastError = e
                console.log(`❌ Модель ${modelName} не сработала, пробуем следующую...`)
            }
        }
        
        if (response) {
            await ctx.reply(response)
        } else {
            throw lastError || new Error('Все модели недоступны')
        }
        
    } catch (error) {
        console.error('Gemini Error:', error)
        
        // Понятное сообщение об ошибке
        if (error.message?.includes('API key')) {
            ctx.reply('❌ Ошибка API ключа. Проверьте GEMINI_API_KEY в .env')
        } else if (error.message?.includes('quota')) {
            ctx.reply('❌ Превышен лимит запросов. Попробуйте позже.')
        } else if (error.message?.includes('not found')) {
            ctx.reply('❌ Модель недоступна. Проблема с API Gemini.')
        } else {
            ctx.reply('❌ Ошибка при обращении к ИИ. Попробуйте позже.')
        }
    }
}

// Обрабатываем все текстовые сообщения как вопросы к ИИ (кроме команд)
bot.on('text', async (ctx) => {
    const text = ctx.message.text
    
    // Игнорируем команды
    if (text.startsWith('/')) return
    
    // Игнорируем текст кнопок
    const buttons = ['❓ Вопросы и ответы', '🏥 О нас', '📋 Помощь', '🤖 Спросить ИИ']
    if (buttons.includes(text)) return
    
    // Спрашиваем, хочет ли пользователь использовать ИИ
    const keyboard = {
        inline_keyboard: [
            [{ text: '🤖 Да, спросить ИИ', callback_data: 'ask_ai' }],
            [{ text: '❓ Посмотреть FAQ', callback_data: 'show_faq' }]
        ]
    }
    
    await ctx.reply(
        '❓ Я вижу ваш вопрос. Хотите спросить ИИ-помощника или посмотреть готовые ответы?',
        { reply_markup: keyboard }
    )
    
    // Сохраняем вопрос для ИИ
    ctx.session = { pendingQuestion: text }
})

// Обработка callback кнопок
bot.action('ask_ai', async (ctx) => {
    await ctx.answerCbQuery()
    const question = ctx.session?.pendingQuestion
    
    if (question) {
        await askGemini(ctx, question)
    } else {
        await ctx.reply('Напишите ваш вопрос')
    }
})

bot.action('show_faq', async (ctx) => {
    await ctx.answerCbQuery()
    show.Questions(ctx)
})

// Запуск
bot.launch()
console.log('✅ Бот работает!')