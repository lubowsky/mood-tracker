// src\bot\commands\addEntry.ts
import { Composer, InlineKeyboard } from "grammy"
import { MyContext } from "../middlewares/userMiddleware"
import { EntryService } from "../../services/entryService"
import { formatDate } from "../../utils/timeUtils"
import { finishConversation, goMainButton } from "../../utils/conversationUtils"

const popularEmotions = [
  "😊 Радость", "😌 Спокойствие", "🤗 Удовлетворение", "🎉 Восторг", "💖 Любовь",
  "🙏 Благодарность", "🌟 Вдохновение", "😇 Умиротворение", "🤩 Восхищение",
  "😐 Нейтрально", "🤔 Задумчивость", "🧐 Любопытство", "⏳ Ожидание",
  "😔 Грусть", "😢 Печаль", "😠 Злость", "😤 Раздражение", "😰 Тревога",
  "😨 Страх", "😓 Усталость", "😩 Истощение", "😞 Разочарование",
  "😒 Скука", "😖 Напряжение", "😵 Замешательство", "🥺 Обида"
]

function createEmotionsKeyboard(selected: string[] = []) {
  const kb = new InlineKeyboard()

  for (let i = 0; i < popularEmotions.length; i += 2) {
    const pair = popularEmotions.slice(i, i + 2)

    pair.forEach((emotion) => {
      const name = emotion.split(" ")[1]
      const isSelected = selected.includes(name)
      const text = isSelected ? `✅ ${emotion}` : emotion
      const cb = isSelected
        ? `deselect_emotion_${name}`
        : `select_emotion_${name}`

      kb.text(text, cb)
    })

    if (i + 2 < popularEmotions.length) kb.row()
  }

  kb.row()
  kb.text("✍️ Свои эмоции", "custom_emotions")
  kb.row()

  if (selected.length > 0) {
    kb.text(`✅ Готово (${selected.length})`, "emotions_done")
  } else {
    kb.text("❌ Нет эмоций", "emotions_none")
  }

  return withMainMenuNoSkip(kb)
}

function formatEntrySummary(session: EntrySession): string {
  const lines: string[] = []

  lines.push(`📅 ${formatDate(new Date())}`)
  lines.push("")

  lines.push(`🏥 *Физическое состояние:* ${session.data.overallPhysical}/10`)
  lines.push(`🧠 *Ментальное состояние:* ${session.data.overallMental}/10`)
  lines.push("")

  if (session.data.physicalSymptoms.length) {
    lines.push("🤕 *Физические симптомы:*")
    session.data.physicalSymptoms.forEach((s) =>
      lines.push(`• ${s.name}`)
    )
    lines.push("")
  }

  if (session.data.emotions.length) {
    lines.push("💭 *Эмоции:*")
    session.data.emotions.forEach((e) => {
      const emoji = popularEmotions.find(p => p.includes(e.name))?.split(" ")[0] ?? "•"
      lines.push(`${emoji} ${e.name}`)
    })
    lines.push("")
  }

  if (session.data.thoughts) {
    lines.push("🧠 *Мысли:*")
    lines.push(session.data.thoughts)
    lines.push("")
  }

  if (session.data.food) {
    lines.push(`🍽️ *Еда:* ${session.data.food}`)
  }

  if (session.data.activities?.length) {
    lines.push(`🏃 *Активности:* ${session.data.activities.join(", ")}`)
  }

  if (session.data.triggers?.length) {
    lines.push(`🎯 *Триггеры:* ${session.data.triggers.join(", ")}`)
  }

  if (session.data.notes) {
    lines.push(`🗒 *Заметки:* ${session.data.notes}`)
  }

  return lines.join("\n")
}

const composer = new Composer<MyContext>()

const SKIP = "skip_step"
const BACK = "go_main"

const skipButton = { text: "⏭ Пропустить шаг", callback_data: SKIP }

interface EntrySession {
  step: string
  data: {
    physicalSymptoms: Array<{ name: string; intensity: number; location?: string }>
    emotions: Array<{ name: string; intensity: number }>
    thoughts: string
    overallPhysical: number
    overallMental: number
    triggers?: string[]
    activities?: string[]
    food?: string
    stressLevel?: number
    notes?: string
    tags?: string[]
  }
  currentSymptoms?: string[]
  selectedEmotions: string[]
}

const sessions = new Map<number, EntrySession>()

function withMainMenu(keyboard?: InlineKeyboard): InlineKeyboard {
  const kb = keyboard ?? new InlineKeyboard()

  kb.row()
  kb.text(skipButton.text, skipButton.callback_data)
  kb.row()
  kb.text(goMainButton[0].text, goMainButton[0].callback_data)

  return kb
}

function withMainMenuNoSkip(keyboard?: InlineKeyboard): InlineKeyboard {
  const kb = keyboard ?? new InlineKeyboard()

  kb.row()
  kb.text(goMainButton[0].text, goMainButton[0].callback_data)

  return kb
}

function createIntensityKeyboard(step: string) {
  const kb = new InlineKeyboard()
  for (let i = 1; i <= 5; i++) kb.text(i.toString(), `intensity_${step}_${i}`)
  kb.row()
  for (let i = 6; i <= 10; i++) kb.text(i.toString(), `intensity_${step}_${i}`)
  return withMainMenu(kb)
}

function createQuickOptionsKeyboard() {
  const kb = new InlineKeyboard()
  kb.text("🍽️ Еда", "quick_food")
  kb.text("🏃 Активности", "quick_activities")
  kb.row()
  kb.text("🎯 Триггеры", "quick_triggers")
  kb.text("📝 Заметки", "quick_notes")
  kb.row()
  kb.text("✅ Завершить", "quick_finish")
  return withMainMenuNoSkip(kb)
}

composer.hears("📝 Добавить запись", async (ctx) => {
  const userId = ctx.from!.id

  sessions.set(userId, {
    step: "physical_symptoms",
    data: {
      physicalSymptoms: [],
      emotions: [],
      thoughts: "",
      overallPhysical: 0,
      overallMental: 0,
    },
    selectedEmotions: [],
  })

  ctx.session.isAddingEntry = true

  await ctx.reply(
    `🏥 *Физические симптомы*\n
    Опиши физические ощущения (через запятую):
      • Головная боль
      • Тошнота  
      • Усталость
      • Напряжение в мышцах
      • Или другие симптомы\n
      *Пример:* "головная боль, тошнота, напряжение в шее"
    `,
    { parse_mode: "Markdown", reply_markup: withMainMenu() }
  )
})

composer.callbackQuery(BACK, async (ctx) => {
  const userId = ctx.from!.id
  sessions.delete(userId)
  ctx.session.isAddingEntry = false

  await ctx.answerCallbackQuery()
  await finishConversation(ctx)
})

composer.callbackQuery(/^intensity_(physical|mental)_(\d+)$/, async (ctx) => {
  const [, type, value] = ctx.match!
  const session = sessions.get(ctx.from!.id)
  if (!session) return

  const intensity = Number(value)

  if (type === "physical") {
    session.data.overallPhysical = intensity
    session.step = "emotions_selection"
    await ctx.editMessageText(
      `💭 *Выбери эмоции*\n\nОтметь те, которые подходят:`,
      { parse_mode: "Markdown", reply_markup: createEmotionsKeyboard() }
    )
  } else {
    session.data.overallMental = intensity
    session.step = "thoughts"
    
    await ctx.editMessageText(
      `💭 *Мысли*\n\nОпиши, что сейчас в голове`,
      { parse_mode: "Markdown", reply_markup: withMainMenu() }
    )
  }

  await ctx.answerCallbackQuery()
})

composer.callbackQuery(/^select_emotion_(.+)$/, async (ctx) => {
  const emotion = ctx.match![1]
  const session = sessions.get(ctx.from!.id)
  if (!session || session.step !== "emotions_selection") return

  if (!session.selectedEmotions.includes(emotion)) {
    session.selectedEmotions.push(emotion)
  }

  await ctx.editMessageText(
    `💭 *Выбери эмоции* (${session.selectedEmotions.length})`,
    {
      parse_mode: "Markdown",
      reply_markup: createEmotionsKeyboard(session.selectedEmotions),
    }
  )

  await ctx.answerCallbackQuery()
})

composer.callbackQuery(/^deselect_emotion_(.+)$/, async (ctx) => {
  const emotion = ctx.match![1]
  const session = sessions.get(ctx.from!.id)
  if (!session || session.step !== "emotions_selection") return

  session.selectedEmotions = session.selectedEmotions.filter((e) => e !== emotion)

  await ctx.editMessageText(
    `💭 *Выбери эмоции* (${session.selectedEmotions.length})`,
    {
      parse_mode: "Markdown",
      reply_markup: createEmotionsKeyboard(session.selectedEmotions),
    }
  )

  await ctx.answerCallbackQuery()
})

composer.callbackQuery("emotions_done", async (ctx) => {
  const session = sessions.get(ctx.from!.id)
  if (!session) return

  session.selectedEmotions.forEach((e) =>
    session.data.emotions.push({ name: e, intensity: 0 })
  )

  session.step = "mental_intensity"

  await ctx.editMessageText(
    `🧠 *Ментальное состояние*\n\nОцени общее состояние:`,
    { parse_mode: "Markdown", reply_markup: createIntensityKeyboard("mental") }
  )

  await ctx.answerCallbackQuery()
})

composer.callbackQuery("emotions_none", async (ctx) => {
  const session = sessions.get(ctx.from!.id)
  if (!session) return

  session.step = "mental_intensity"

  await ctx.editMessageText(
    `🧠 *Ментальное состояние*\n\nОцени общее состояние:`,
    { parse_mode: "Markdown", reply_markup: createIntensityKeyboard("mental") }
  )

  await ctx.answerCallbackQuery()
})

composer.callbackQuery(/^quick_(.+)$/, async (ctx) => {
  const option = ctx.match![1]
  const session = sessions.get(ctx.from!.id)
  if (!session) return

  switch (option) {
    case "food":
      session.step = "food"
      await ctx.editMessageText("🍽️ Что ел(а)?", { reply_markup: withMainMenu() })
      break

    case "activities":
      session.step = "activities"
      await ctx.editMessageText("🏃 Активности:", { reply_markup: withMainMenu() })
      break

    case "triggers":
      session.step = "triggers"
      await ctx.editMessageText("🎯 Триггеры:", { reply_markup: withMainMenu() })
      break

    case "notes":
      session.step = "notes"
      await ctx.editMessageText("📝 Заметки:", { reply_markup: withMainMenu() })
      break

    case "finish":
      await saveAndFinish(ctx, session)
      return
  }

  await ctx.answerCallbackQuery()
})

composer.callbackQuery(SKIP, async (ctx) => {
  const session = sessions.get(ctx.from!.id)
  if (!session) return

  switch (session.step) {
    case "physical_symptoms":
      session.step = "physical_intensity"
      await ctx.editMessageText(
        `📊 *Общее физическое состояние*`,
        { parse_mode: "Markdown", reply_markup: createIntensityKeyboard("physical") }
      )
      break

    case "thoughts":
      session.step = "quick"
      await ctx.editMessageText(
        "📋 Хочешь добавить что-то ещё?",
        { reply_markup: createQuickOptionsKeyboard() }
      )
      break

    case "food":
    case "activities":
    case "triggers":
    case "notes":
      session.step = "quick"
      await ctx.editMessageText(
        "📋 Хочешь добавить что-то ещё?",
        { reply_markup: createQuickOptionsKeyboard() }
      )
      break
  }

  await ctx.answerCallbackQuery("Шаг пропущен")
})

composer.callbackQuery("custom_emotions", async (ctx) => {
  const session = sessions.get(ctx.from!.id)
  if (!session) return

  session.step = "emotions_custom"

  await ctx.editMessageText(
    `✍️ *Свои эмоции*\n\nНапиши через запятую`,
    { parse_mode: "Markdown", reply_markup: withMainMenu() }
  )

  await ctx.answerCallbackQuery()
})

composer.on("message:text", async (ctx, next) => {
  const session = sessions.get(ctx.from!.id)
  if (!session || !ctx.session.isAddingEntry) return next()

  const text = ctx.message.text

  switch (session.step) {
    case "physical_symptoms":
      session.data.physicalSymptoms = text
        .split(",")
        .map((s) => ({ name: s.trim(), intensity: 0 }))

      session.step = "physical_intensity"
      await ctx.reply(
        `📊 *Общее физическое состояние*`,
        { parse_mode: "Markdown", reply_markup: createIntensityKeyboard("physical") }
      )
      break

    case "thoughts":
      session.data.thoughts = text
      session.step = "quick"
      await ctx.reply("📋 Хочешь добавить что-то ещё?", {
        reply_markup: createQuickOptionsKeyboard(),
      })
      break

    case "food":
      session.data.food = text
      await ctx.reply("✅ Сохранено", { reply_markup: createQuickOptionsKeyboard() })
      break

    case "activities":
      session.data.activities = text.split(",").map((a) => a.trim())
      await ctx.reply("✅ Сохранено", { reply_markup: createQuickOptionsKeyboard() })
      break

    case "triggers":
      session.data.triggers = text.split(",").map((t) => t.trim())
      await ctx.reply("✅ Сохранено", { reply_markup: createQuickOptionsKeyboard() })
      break

    case "notes":
      session.data.notes = text
      await ctx.reply("✅ Сохранено", { reply_markup: createQuickOptionsKeyboard() })
      break

    case "emotions_custom":
      session.data.emotions.push(
        ...text.split(",").map((e) => ({ name: e.trim(), intensity: 0 }))
      )

      session.step = "mental_intensity"
      await ctx.reply(
        `🧠 *Ментальное состояние*`,
        { parse_mode: "Markdown", reply_markup: createIntensityKeyboard("mental") }
      )
      break
  }
})

async function saveAndFinish(ctx: MyContext, session: EntrySession) {
  await EntryService.createManualEntry({
    userId: ctx.user!._id!,
    physicalSymptoms: session.data.physicalSymptoms,
    emotions: session.data.emotions,
    thoughts: session.data.thoughts,
    overallPhysical: session.data.overallPhysical,
    overallMental: session.data.overallMental,
    triggers: session.data.triggers,
    activities: session.data.activities,
    food: session.data.food,
    stressLevel: session.data.stressLevel,
    notes: session.data.notes,
    tags: session.data.tags ?? []
  })

  sessions.delete(ctx.from!.id)
  ctx.session.isAddingEntry = false

  const summary = formatEntrySummary(session)

  await ctx.reply(
    `✅ *Запись сохранена*\n${summary}`,
    { parse_mode: "Markdown" }
  )

  await finishConversation(ctx)
}

export default composer
