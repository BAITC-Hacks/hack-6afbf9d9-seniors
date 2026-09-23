"""Localized explanations of authoritative results; never changes model values."""

SUPPORTED_LANGUAGES = {"ru": "Russian", "kk": "Kazakh", "en": "English"}

NOTICES = {
    "ru": {
        "demo": "Демонстрационный режим: текст сформирован по правилам модели, без языковой модели. Для AI-анализа задайте OPENAI_API_KEY на сервере.",
        "failed": "AI-сервис не ответил или вернул некорректный результат. Показан локальный анализ по правилам модели; расчёт показателей не изменился.",
        "ai": "Текст подготовлен AI по результатам фиксированной модели. Данные синтетические; рекомендации требуют проверки в симуляторе.",
    },
    "kk": {
        "demo": "Демонстрациялық режим: мәтін тілдік модельсіз, модель ережелері бойынша жасалды. AI талдауы үшін серверде OPENAI_API_KEY орнатыңыз.",
        "failed": "AI қызметі жауап бермеді немесе жарамсыз нәтиже қайтарды. Модель ережелеріне негізделген жергілікті талдау көрсетілді; көрсеткіштердің есебі өзгерген жоқ.",
        "ai": "Мәтінді AI бекітілген модель нәтижелері бойынша дайындады. Деректер синтетикалық; ұсыныстарды симуляторда тексеру қажет.",
    },
    "en": {
        "demo": "Demo mode: this text follows the model rules without a language model. Set OPENAI_API_KEY on the server to enable AI analysis.",
        "failed": "The AI service did not respond or returned an invalid result. Local analysis based on the model rules is shown; the indicator calculations have not changed.",
        "ai": "AI prepared this text from the fixed model results. The data is synthetic; recommendations must be checked in the simulator.",
    },
}

SUMMARIES = {
    "ru": "Сценарий использует {spent} из {budget} единиц бюджета. Astana Quality of Life Score: {baselineScore:.2f} → {score:.2f} ({delta:+.2f} балла). Результат рассчитан по фиксированной модели с учётом эффектов, сроков, взаимодействий мероприятий и различий между районами.",
    "kk": "Сценарий бюджеттегі {budget} бірліктің {spent} бірлігін пайдаланады. Astana Quality of Life Score: {baselineScore:.2f} → {score:.2f} ({delta:+.2f} ұпай). Нәтиже әсерлерді, мерзімдерді, іс-шаралардың өзара байланысын және аудандар арасындағы айырмашылықтарды ескеретін бекітілген модель бойынша есептелді.",
    "en": "The scenario uses {spent} of {budget} budget units. Astana Quality of Life Score: {baselineScore:.2f} → {score:.2f} ({delta:+.2f} points). The result uses the fixed model, accounting for effects, timing, interactions between initiatives and differences between districts.",
}

LABELS = {
    "kk": {
        "transport": "Көлік", "green": "Экология", "social": "Әлеуметтік сала",
        "safety": "Қауіпсіздік", "services": "Қалалық қызметтер",
        "esil": "Есіл", "almaty": "Алматы", "saryarka": "Сарыарқа",
        "baikonur": "Байқоңыр", "nura": "Нұра",
    },
    "en": {
        "transport": "Transport", "green": "Environment", "social": "Social infrastructure",
        "safety": "Safety", "services": "City services",
        "esil": "Esil", "almaty": "Almaty", "saryarka": "Saryarka",
        "baikonur": "Baikonur", "nura": "Nura",
    },
}

FACTS = {
    "kk": {
        "best": "Ең үлкен өсім «{category}» бағытында: +{delta:.2f} ұпай.",
        "minimum": "Ең төмен аудандық баға {before:.2f} ұпайдан {after:.2f} ұпайға өсті.",
        "removed": "Сыни аймақтан шыққан көрсеткіштер саны: {count}. Бұл қорытынды Score айыбын азайтады.",
        "synergy": "{pair} синергиясы {district} ауданында қосымша әсер береді.",
        "critical": "40-тан төмен көрсеткіштер саны: {count}. Әрқайсысы қорытынды Score нәтижесін 1 ұпайға азайтады.",
        "critical_tip": "40-тан төмен көрсеткіштерді тексеріңіз: осы қажеттіліктерге басымдық беру айыпты жоюға көмектесуі мүмкін.",
        "crossings": "M11 қауіпсіз өткелдері жол қауіпсіздігін арттырады, бірақ таңдалған аудандағы T1 жолдарды босату көрсеткішін 1,75 ұпайға төмендетеді.",
        "slow": "Іске қосылу кідірісіне байланысты кейбір әсерлер 8 тоқсандық кезеңнен кейін көрінеді: {initiatives}.",
        "untouched": "Орташа көрсеткіштері өзгермеген бағыттар: {categories}.",
        "remaining": "Бюджеттің қалған {remaining} бірлігі қосымша ұпай бермейді. Іс-шараларды ауыстыру нұсқаларын әсері мен мерзімі бойынша салыстырыңыз.",
        "weakest": "Ең төмен аудандық нәтиже — {district} ({score:.2f}). Оны жақсарту орташа бағаға да, ең төмен аудан бағасына да әсер етеді.",
        "add": "Қорытынды талдауға дейін тағы {count} іс-шара қосыңыз. Бір бағытта 2-ден артық іс-шара таңдауға болмайды.",
    },
    "en": {
        "best": "The largest category improvement is in {category}: +{delta:.2f} points.",
        "minimum": "The lowest district score rose from {before:.2f} to {after:.2f}.",
        "removed": "Indicators lifted out of the critical zone: {count}. This reduces the final Score penalty.",
        "synergy": "The {pair} synergy provides an additional effect in {district}.",
        "critical": "Indicators still below 40: {count}. Each reduces the final Score by 1 point.",
        "critical_tip": "Review indicators below 40: prioritizing these needs may remove the penalty.",
        "crossings": "Safe crossings M11 improve road safety but reduce the T1 traffic relief indicator by 1.75 points in the selected district.",
        "slow": "Due to implementation delays, part of the effect falls beyond the 8-quarter horizon: {initiatives}.",
        "untouched": "Categories with unchanged average indicators: {categories}.",
        "remaining": "The remaining {remaining} budget units provide no bonus. Compare affordable replacements by their effects and implementation delays.",
        "weakest": "The lowest district result is {district} ({score:.2f}). Improving it affects both the city average and the minimum-district component.",
        "add": "Add {count} more initiatives before final analysis, keeping within the limit of 2 per category.",
    },
}


def validate_language(language: object) -> str:
    if not isinstance(language, str) or language not in SUPPORTED_LANGUAGES:
        raise ValueError("Язык должен быть ru, kk или en.")
    return language


def localized_facts(evaluation: dict, language: str) -> dict:
    """Produce readable facts from already evaluated state, without translating IDs."""
    if language == "ru":
        return {key: evaluation.get(key, []) for key in ("strengths", "risks", "recommendations")}
    labels, phrases = LABELS[language], FACTS[language]
    strengths, risks, recommendations = [], [], []
    selected = evaluation["decisions"]
    districts = evaluation["districts"]
    metrics = evaluation["metrics"]
    if selected:
        best = max(metrics, key=lambda item: item["delta"])
        if best["delta"] > 0:
            strengths.append(phrases["best"].format(category=labels[best["id"]], delta=best["delta"]))
        before_minimum = min(item["before"] for item in districts)
        if evaluation["minDistrict"] > before_minimum:
            strengths.append(phrases["minimum"].format(before=before_minimum, after=evaluation["minDistrict"]))
        removed = evaluation["baselineCriticalCount"] - evaluation["criticalCount"]
        if removed > 0:
            strengths.append(phrases["removed"].format(count=removed))
        for synergy in evaluation["synergies"]:
            strengths.append(phrases["synergy"].format(pair=synergy["id"], district=labels[synergy["districtId"]]))
    if evaluation["criticalCount"]:
        risks.append(phrases["critical"].format(count=evaluation["criticalCount"]))
        recommendations.append(phrases["critical_tip"])
    if any(item["initiativeId"] == "M11" for item in selected):
        risks.append(phrases["crossings"])
    slow = [item["initiativeId"] for item in selected if item["lag"] >= 3]
    if slow:
        risks.append(phrases["slow"].format(initiatives=", ".join(slow)))
    untouched = [labels[item["id"]] for item in metrics if item["delta"] == 0]
    if untouched and selected:
        risks.append(phrases["untouched"].format(categories=", ".join(untouched)))
    if len(selected) < 5:
        recommendations.append(phrases["add"].format(count=5 - len(selected)))
    if evaluation["remaining"] and selected:
        recommendations.append(phrases["remaining"].format(remaining=evaluation["remaining"]))
    weakest = min(districts, key=lambda item: item["after"])
    recommendations.append(phrases["weakest"].format(district=labels[weakest["id"]], score=evaluation["minDistrict"]))
    return {"strengths": strengths, "risks": risks, "recommendations": recommendations}
