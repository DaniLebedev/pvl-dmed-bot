const questionsData = require('./questions.json')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const fs = require('fs')
const path = require('path')

class Show {
    constructor(bot) {
        this.bot = bot
        // Сохраняем оригинальный порядок из файла
        this.originalQuestions = JSON.parse(JSON.stringify(questionsData.questions))
        // Для работы используем копию, которую можно сортировать
        this.questions = [...questionsData.questions]
        this.questionsPath = path.join(__dirname, 'questions.json')
        this.setupGlobalHandler()
    }

    setupGlobalHandler() {
        this.bot.on('callback_query', (ctx) => {
            const data = ctx.callbackQuery.data
            ctx.answerCbQuery()
            ctx.isCallback = true

            if (data === 'm_faq') {
                this.Questions(ctx)
            }
            else if (data === 'm_about') {
                this.About(ctx)
            }
            else if (data === 'm_help') {
                this.Help(ctx)
            }
            else if (data.startsWith('show_')) {
                this.showAnswer(ctx, data)
            }
            else if (data === 'back_questions') {
                this.Questions(ctx)
            }
            else if (data === 'main_menu') {
                this.MainMenu(ctx)
            }
        })
    }

    // Универсальная отправка сообщения
    async sendOrEdit(ctx, text, keyboard) {
        const options = {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        }

        try {
            if (ctx.isCallback) {
                await ctx.editMessageText(text, options)
            } else {
                try { await ctx.deleteMessage() } catch { }
                await ctx.reply(text, options)
            }
        } catch (error) {
            if (error.description?.includes("message can't be edited")) {
                await ctx.reply(text, options)
            } else {
                console.error('Error:', error)
            }
        }
    }

    // СОХРАНЕНИЕ ТОЛЬКО ИЗМЕНЕНИЙ
    async saveViewCount(questionId, newViews) {
        try {
            // Читаем текущий файл
            const fileData = JSON.parse(fs.readFileSync(this.questionsPath, 'utf8'))

            // Находим вопрос и обновляем только views
            const question = fileData.questions.find(q => q.id === questionId)
            if (question) {
                question.views = newViews

                // Записываем обратно
                fs.writeFileSync(
                    this.questionsPath,
                    JSON.stringify(fileData, null, 2),
                    'utf8'
                )
                console.log(`✅ Views для вопроса ${questionId} обновлены: ${newViews}`)
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error)
        }
    }

    // О нас
    async About(ctx) {
        const text = '🏥 *О клинике:*\n\n' +
            'КГП на ПХВ  «Областной реабилитационный центр» оказывает реабилитационную помощь с 1998 года (далее – Центр) и обслуживает детское и подростковое население города Павлодара  и Павлодарской области. Свою деятельность Центр осуществляет в соответствии с лицензиями, согласно базе нормативно - правовых актов по реабилитации.\n\n' +
            '🕒График работы:\n пн-пт с 8:00 до 18:00,\n сб,вс праздники выходной\n\n' +
            '🏥 *Наши адреса:*\n\n' +
            '📍 *Корпус 1:*\n КГП на ПХВ «Областной реабилитационный центр»(Ажар)\nАдрес: ул. Лермонтова,59\n\n*📱Контакты:*\n8(7182) 555210\n8(7182) 555227\n\n' +
            '📍 *Корпус 3:*\n КГП на ПХВ «Областной реабилитационный центр»(QH)\nАдрес: ул. Торайгырова,46\n\n*📱Контакты:*\n8(7182) 665705\n\n' +
            '📍 *Корпус 4:*\n КГП на ПХВ «Областной реабилитационный центр»(Қамқорлық)\nАдрес: ул. Ак.Чокина,148\n\n*📱Контакты:*\n8(7182) 669257\n\n';




        const keyboard = [
            [{ text: '🔙 Назад', callback_data: 'main_menu' }]
        ]

        await this.sendOrEdit(ctx, text, keyboard)
    }

    // Вопросы - с сортировкой для отображения, но без сохранения порядка
    async Questions(ctx) {
        // Сортируем КОПИЮ для отображения (оригинальный порядок не меняется)
        const sortedForDisplay = [...this.questions].sort((a, b) => b.views - a.views)

        let keyboard = sortedForDisplay.map(quest => ([
            {
                text: `• ${quest.question}`,
                callback_data: `show_${quest.id}`
            }
        ]))

        keyboard.push([{ text: '🔙 Назад', callback_data: 'main_menu' }])

        await this.sendOrEdit(ctx, '❓ *Часто задаваемые вопросы:*', keyboard)
    }

    // Показать ответ на вопрос
    async showAnswer(ctx, data) {
        const id = parseInt(data.split('_')[1])

        // Ищем вопрос в массиве
        const qIndex = this.questions.findIndex(q => q.id === id)

        if (qIndex !== -1) {
            // Увеличиваем просмотры
            this.questions[qIndex].views++
            const newViews = this.questions[qIndex].views
            // Сохраняем ТОЛЬКО ИЗМЕНЕНИЕ в JSON
            await this.saveViewCount(id, newViews)

            const text = `❓ *${this.questions[qIndex].question}*\n\n${this.questions[qIndex].answer}`
            const keyboard = [
                [{ text: '◀️ Назад', callback_data: 'back_questions' }],
                [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
            ]

            await this.sendOrEdit(ctx, text, keyboard)
        }
    }

    // Помощь
    async Help(ctx) {
        const text = '📋 *Доступные команды:*\n\n' +
            '/start - Запуск\n' +
            '/about - О нас\n' +
            '/faq - Вопросы и ответы\n'+
            '/ai - Консультация с ии'

        const keyboard = [
            [{ text: '🔙 Назад', callback_data: 'main_menu' }]
        ]

        await this.sendOrEdit(ctx, text, keyboard)
    }

    // Главное меню
    async MainMenu(ctx) {
        const text = '🏠 *Главное меню*\n\nВыберите раздел:'
        const keyboard = [
            [{ text: '❓Вопросы и ответы', callback_data: 'm_faq' }],
            [{ text: '🏥 О нас', callback_data: 'm_about' }],
            [{ text: '📋 Помощь', callback_data: 'm_help' }]
        ]

        await this.sendOrEdit(ctx, text, keyboard)
    }
}

module.exports = Show