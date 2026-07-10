import { filmKey } from './filmKey.js'
import { posterUrl } from './enrich.js'

// ---------------------------------------------------------------------------
// Carte de résultat partageable — dessinée en canvas (1080×1350, format 4:5
// réseaux sociaux), sans dépendance. Framework-free mais PAS pur : DOM canvas,
// polices web et images proxifiées (/api/img) pour éviter le canvas "tainted".
// ---------------------------------------------------------------------------

const W = 1080
const H = 1350

const C = {
  night: '#0c0e11',
  card: '#161a20',
  well: '#101318',
  line: '#272d36',
  ink: '#e9e2d3',
  mut: '#98938a',
  faint: '#807b6f',
  green: '#00e054',
  blue: '#40bcf4',
  orange: '#ff8000',
}

const tone = (t) => (t === 'green' ? C.green : t === 'blue' ? C.blue : C.orange)

// Image via le proxy CORS ; null si échec (la carte se dessine sans).
function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = `/api/img?u=${encodeURIComponent(url)}`
    setTimeout(() => resolve(null), 8000) // pas d'attente infinie
  })
}

function roundedPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// drawImage en "object-fit: cover" dans un rect arrondi.
function drawCover(ctx, img, x, y, w, h, r) {
  ctx.save()
  roundedPath(ctx, x, y, w, h, r)
  ctx.clip()
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

function circleImage(ctx, img, cx, cy, radius, ringColor, fallbackInitial) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()
  if (img) {
    const scale = Math.max((radius * 2) / img.width, (radius * 2) / img.height)
    ctx.drawImage(
      img,
      cx - (img.width * scale) / 2,
      cy - (img.height * scale) / 2,
      img.width * scale,
      img.height * scale,
    )
  } else {
    ctx.fillStyle = C.well
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
    ctx.fillStyle = ringColor
    ctx.font = `italic 600 ${radius}px Fraunces, Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(fallbackInitial, cx, cy + radius * 0.06)
  }
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.lineWidth = 5
  ctx.strokeStyle = ringColor
  ctx.stroke()
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

/**
 * Dessine la carte de partage et renvoie le canvas.
 * @param {object} result   résultat de computeCompatibility
 * @param {Map|null} enrichMap  Map filmKey -> infos TMDB (affiches)
 */
export async function renderShareCard(result, enrichMap) {
  const { profiles, score, label, overlap, taste, lovedInCommon } = result

  // Polices prêtes AVANT de dessiner (sinon fallback moche).
  await Promise.all([
    document.fonts.load('600 160px Fraunces'),
    document.fonts.load('italic 600 44px Fraunces'),
    document.fonts.load('700 30px Archivo'),
    document.fonts.load('400 26px Archivo'),
  ]).catch(() => {})

  // Affiches des adorés en commun (5 max) + avatars, en parallèle.
  const lovedPosters = lovedInCommon
    .map((f) => {
      const info = enrichMap?.get(filmKey(f.name, f.year))
      return { film: f, url: posterUrl(info?.posterPath, 'w342') }
    })
    .filter((p) => p.url)
    .slice(0, 5)

  const [avatarA, avatarB, ...posterImgs] = await Promise.all([
    loadImage(profiles.a.avatarUrl),
    loadImage(profiles.b.avatarUrl),
    ...lovedPosters.map((p) => loadImage(p.url)),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fond
  ctx.fillStyle = C.night
  ctx.fillRect(0, 0, W, H)

  // En-tête : tri-points + wordmark
  const dotsY = 92
  ctx.fillStyle = C.green
  ctx.beginPath()
  ctx.arc(W / 2 - 30, dotsY, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.blue
  ctx.beginPath()
  ctx.arc(W / 2 + 30, dotsY, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = C.orange
  ctx.beginPath()
  ctx.arc(W / 2, dotsY, 9, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = C.mut
  ctx.font = '700 30px Archivo, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.letterSpacing = '8px'
  ctx.fillText('LETTERBOXD MATCH', W / 2, dotsY + 74)
  ctx.letterSpacing = '0px'

  // Ticket
  const tx = 70
  const ty = 210
  const tw = W - 140
  const th = 640
  ctx.fillStyle = C.card
  roundedPath(ctx, tx, ty, tw, th, 28)
  ctx.fill()
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  roundedPath(ctx, tx, ty, tw, th, 28)
  ctx.stroke()

  // Encoches du ticket
  for (const side of [tx, tx + tw]) {
    ctx.beginPath()
    ctx.arc(side, ty + th / 2, 26, 0, Math.PI * 2)
    ctx.fillStyle = C.night
    ctx.fill()
    ctx.strokeStyle = C.line
    ctx.stroke()
  }

  // Bande "admit two"
  ctx.fillStyle = C.faint
  ctx.font = '700 22px Archivo, sans-serif'
  ctx.letterSpacing = '6px'
  ctx.textAlign = 'left'
  ctx.fillText('CINÉ-COMPATIBILITÉ', tx + 48, ty + 62)
  ctx.textAlign = 'right'
  ctx.fillText('ADMIT TWO', tx + tw - 48, ty + 62)
  ctx.letterSpacing = '0px'
  ctx.strokeStyle = C.line
  ctx.setLineDash([8, 8])
  ctx.beginPath()
  ctx.moveTo(tx + 32, ty + 88)
  ctx.lineTo(tx + tw - 32, ty + 88)
  ctx.stroke()
  ctx.setLineDash([])

  // Avatars + score
  const centerY = ty + 300
  const accent = tone(label.tone)
  circleImage(ctx, avatarA, tx + 190, centerY, 92, C.green, (profiles.a.username || '?')[0].toUpperCase())
  circleImage(ctx, avatarB, tx + tw - 190, centerY, 92, C.blue, (profiles.b.username || '?')[0].toUpperCase())

  // Noms + nb de films
  ctx.textAlign = 'center'
  ctx.font = '700 34px Archivo, sans-serif'
  ctx.fillStyle = C.green
  ctx.fillText(truncate(ctx, profiles.a.username, 300), tx + 190, centerY + 150)
  ctx.fillStyle = C.blue
  ctx.fillText(truncate(ctx, profiles.b.username, 300), tx + tw - 190, centerY + 150)
  ctx.font = '400 24px Archivo, sans-serif'
  ctx.fillStyle = C.faint
  ctx.fillText(`${profiles.a.watchedCount.toLocaleString('fr-FR')} films`, tx + 190, centerY + 186)
  ctx.fillText(`${profiles.b.watchedCount.toLocaleString('fr-FR')} films`, tx + tw - 190, centerY + 186)

  // Anneau de score
  const ringR = 118
  ctx.beginPath()
  ctx.arc(W / 2, centerY, ringR, 0, Math.PI * 2)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 12
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(W / 2, centerY, ringR, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2)
  ctx.strokeStyle = accent
  ctx.lineCap = 'round'
  ctx.stroke()

  ctx.fillStyle = accent
  ctx.font = '600 132px Fraunces, Georgia, serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(score), W / 2, centerY - 8)
  ctx.font = '700 22px Archivo, sans-serif'
  ctx.fillStyle = C.faint
  ctx.letterSpacing = '6px'
  ctx.fillText('/ 100', W / 2, centerY + 74)
  ctx.letterSpacing = '0px'
  ctx.textBaseline = 'alphabetic'

  // Verdict
  ctx.fillStyle = accent
  ctx.font = 'italic 600 44px Fraunces, Georgia, serif'
  ctx.fillText(`« ${label.title} »`, W / 2, ty + th - 92)

  // Ligne de stats
  ctx.font = '400 26px Archivo, sans-serif'
  ctx.fillStyle = C.mut
  const corr =
    taste.correlation == null
      ? 'notes non comparables'
      : `corrélation des notes ${taste.correlation >= 0 ? '+' : ''}${taste.correlation.toFixed(2)}`
  ctx.fillText(
    `${overlap.common.toLocaleString('fr-FR')} films vus en commun · ${corr}`,
    W / 2,
    ty + th - 40,
  )

  // Adorés en commun (affiches)
  let cursorY = ty + th + 56
  if (posterImgs.filter(Boolean).length >= 3) {
    ctx.fillStyle = C.faint
    ctx.font = '700 22px Archivo, sans-serif'
    ctx.letterSpacing = '5px'
    ctx.fillText('ADORÉS EN COMMUN', W / 2, cursorY)
    ctx.letterSpacing = '0px'
    cursorY += 28

    const shown = posterImgs.map((img, i) => ({ img, film: lovedPosters[i].film })).filter((p) => p.img)
    const n = Math.min(shown.length, 5)
    const pw = 168
    const ph = 252
    const gap = 20
    const totalW = n * pw + (n - 1) * gap
    let px = (W - totalW) / 2
    for (let i = 0; i < n; i++) {
      drawCover(ctx, shown[i].img, px, cursorY, pw, ph, 10)
      ctx.strokeStyle = C.line
      ctx.lineWidth = 2
      roundedPath(ctx, px, cursorY, pw, ph, 10)
      ctx.stroke()
      px += pw + gap
    }
    cursorY += ph + 46
  } else {
    cursorY += 10
  }

  // Pied de carte
  ctx.fillStyle = C.ink
  ctx.font = '700 30px Archivo, sans-serif'
  ctx.fillText(window.location.host || 'letterboxd-match-app.vercel.app', W / 2, H - 96)
  ctx.fillStyle = C.faint
  ctx.font = '400 22px Archivo, sans-serif'
  ctx.fillText('Données Letterboxd · Affiches TMDB · Non affilié', W / 2, H - 56)

  return canvas
}

/** Télécharge la carte en PNG. */
export async function downloadShareCard(result, enrichMap) {
  const canvas = await renderShareCard(result, enrichMap)
  const a = document.createElement('a')
  a.download = `letterboxd-match-${result.profiles.a.username}-${result.profiles.b.username}.png`.replace(
    /\s+/g,
    '-',
  )
  a.href = canvas.toDataURL('image/png')
  a.click()
}

/** Partage natif (mobile) si disponible ; sinon renvoie false. */
export async function shareCard(result, enrichMap) {
  if (!navigator.canShare) return false
  const canvas = await renderShareCard(result, enrichMap)
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  const file = new File([blob], 'letterboxd-match.png', { type: 'image/png' })
  if (!navigator.canShare({ files: [file] })) return false
  await navigator.share({
    files: [file],
    title: 'Letterboxd Match',
    text: `${result.profiles.a.username} × ${result.profiles.b.username} : ${result.score}/100 de ciné-compatibilité`,
  })
  return true
}
