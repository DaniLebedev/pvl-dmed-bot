const { Telegraf } = require('telegraf')
const Show = require('./functions')
require('dotenv').config()

const token = process.env.BOT_TOKEN
if (!token) {
    console.error('Ошибка: токен не найден в .env')
    process.exit(1)
}

const bot = new Telegraf(token)

// Создаем экземпляр класса и передаем ему bot
const show = new Show(bot)

// Команды
bot.start((ctx) => {
    ctx.reply('Зраствуйте!', {
        reply_markup: {
            keyboard: [
                ['❓FAQ', '🏥 О нас'],
                ['📋 Помощь']
            ],
            resize_keyboard: true
        }
    })
    show.MainMenu(ctx);

})

// Команды
bot.command('faq', (ctx) => show.Questions(ctx))
bot.command('about', (ctx) => show.About(ctx))
bot.command('help', (ctx) => show.Help(ctx))


// Обработка текстовых кнопок
bot.hears('❓FAQ', (ctx) => show.Questions(ctx))
bot.hears('🏥 О нас', (ctx) => show.About(ctx))
bot.hears('📋 Помощь', (ctx) => show.Help(ctx))

// Запуск
bot.launch()