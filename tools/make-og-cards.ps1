# Generates the 1200x630 link preview cards with GDI+.
#
# Space Grotesk and Nunito are not installed on this machine, so this uses Segoe
# UI and Georgia, which are the next entries in the site's own --font-head and
# --font-serif stacks. Colours are lifted straight from styles.css.
#
# The middle dot is built from a char code and never typed as a literal:
# PowerShell 5.1 reads a .ps1 as ANSI unless it carries a BOM, so a literal UTF-8
# middle dot arrives as two characters and prints as mojibake.
Add-Type -AssemblyName System.Drawing

$out = 'c:\Users\BS01425\Desktop\Tahsin Tazwar Portfolio\assets'
$W = 1200; $H = 630
$DOT = [string][char]0x00B7

function Hex($h) { [System.Drawing.ColorTranslator]::FromHtml($h) }

# GDI+ has no letter spacing, so tracked text is drawn glyph by glyph.
function Draw-Tracked($g, $text, $font, $brush, $x, $y, $track) {
  $cx = $x
  foreach ($ch in $text.ToCharArray()) {
    $s = [string]$ch
    $g.DrawString($s, $font, $brush, $cx, $y)
    $cx += $g.MeasureString($s, $font).Width - 4 + $track
  }
}

# Draws, and reports rather than silently colliding with the artwork.
function Draw-Fit($g, $text, $font, $brush, $x, $y, $maxW) {
  $w = $g.MeasureString($text, $font).Width
  if ($w -gt $maxW) { "  OVERFLOW {0}px of {1}px : {2}" -f [int]$w, $maxW, $text }
  $g.DrawString($text, $font, $brush, $x, $y)
}

function New-Card {
  $bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gg = [System.Drawing.Graphics]::FromImage($bmp)
  $gg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  # Base: the site's --bg to --bg-2 vertical wash.
  $rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
  $wash = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, (Hex '#0a0d05'), (Hex '#121808'), 90.0)
  $gg.FillRectangle($wash, $rect)
  $wash.Dispose()

  # The lime glow the site paints behind the hero.
  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowPath.AddEllipse(420, -360, 1120, 900)
  $glow = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
  $glow.CenterColor = [System.Drawing.Color]::FromArgb(58, 204, 255, 0)
  $glow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 204, 255, 0))
  $gg.FillPath($glow, $glowPath)
  $glow.Dispose(); $glowPath.Dispose()

  # The 24px dot grid from body::after.
  $dot = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(13, 255, 255, 255))
  for ($x = 0; $x -lt $W; $x += 24) {
    for ($y = 0; $y -lt $H; $y += 24) { $gg.FillRectangle($dot, $x, $y, 2, 2) }
  }
  $dot.Dispose()

  $script:bmp = $bmp
  $script:g = $gg
}

function Add-Footer($text) {
  $f = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Regular)
  $b = New-Object System.Drawing.SolidBrush (Hex '#7e8a6b')
  $script:g.DrawString($text, $f, $b, 78, 522)
  $f.Dispose(); $b.Dispose()
}

function Save-Card($name) {
  $path = Join-Path $out $name
  $script:g.Dispose()
  $script:bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $script:bmp.Dispose()
  "{0}  {1} x {2}  {3} KB" -f $name, $W, $H, [math]::Round((Get-Item $path).Length / 1KB)
}

$kick   = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$h1     = New-Object System.Drawing.Font('Segoe UI', 62, [System.Drawing.FontStyle]::Bold)
$h2     = New-Object System.Drawing.Font('Segoe UI', 50, [System.Drawing.FontStyle]::Bold)
$serif1 = New-Object System.Drawing.Font('Georgia', 62, [System.Drawing.FontStyle]::Italic)
$serif2 = New-Object System.Drawing.Font('Georgia', 50, [System.Drawing.FontStyle]::Italic)
$sub    = New-Object System.Drawing.Font('Segoe UI', 21, [System.Drawing.FontStyle]::Regular)
$lime   = New-Object System.Drawing.SolidBrush (Hex '#ccff00')
$orange = New-Object System.Drawing.SolidBrush (Hex '#ff8a2b')
$white  = New-Object System.Drawing.SolidBrush (Hex '#f4f8e9')
$muted  = New-Object System.Drawing.SolidBrush (Hex '#aeb99b')

# ---------------------------------------------------------------- home card
# The portrait ring starts at x=734, so the text column has 640px to live in.
New-Card
Draw-Tracked $g ('DHAKA  ' + $DOT + '  WORKING GLOBALLY') $kick $lime 78 148 3

$g.DrawString('Tahsin', $h1, $white, 70, 186)
$w1 = $g.MeasureString('Tahsin', $h1).Width
$gr = New-Object System.Drawing.Rectangle((70 + [int]$w1 - 26), 190, 420, 110)
$limeGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($gr, (Hex '#eaff9e'), (Hex '#a3e635'), 20.0)
$g.DrawString('Tazwar', $serif1, $limeGrad, (70 + $w1 - 26), 190)
$limeGrad.Dispose()

Draw-Fit $g 'Co-Founder, OutsourceToBD' $sub $muted 76 330 640
Draw-Fit $g ('Venture Architect  ' + $DOT + '  Ecosystem Builder') $sub $muted 76 368 640

# Circular portrait with the lime ring, matching the hero treatment.
$photo = [System.Drawing.Image]::FromFile((Join-Path $out 'tahsin.png'))
$d = 372; $px = 748; $py = 128
$clip = New-Object System.Drawing.Drawing2D.GraphicsPath
$clip.AddEllipse($px, $py, $d, $d)
$g.SetClip($clip)
$g.DrawImage($photo, $px, $py, $d, $d)
$g.ResetClip()
$ring = New-Object System.Drawing.Pen((Hex '#ccff00'), 3)
$g.DrawEllipse($ring, ($px - 14), ($py - 14), ($d + 28), ($d + 28))
$ring.Dispose(); $clip.Dispose(); $photo.Dispose()

Add-Footer 'tahsintazwar.com'
Save-Card 'og-home.png'

# ------------------------------------------------------------- talent card
# The network mark starts near x=790, so the text column has 690px.
New-Card
Draw-Tracked $g 'TALENT NETWORK' $kick $lime 78 148 3
Draw-Fit $g 'Global Tech Sales' $h2 $white 70 190 690
$gr2 = New-Object System.Drawing.Rectangle(70, 262, 520, 90)
$grad2 = New-Object System.Drawing.Drawing2D.LinearGradientBrush($gr2, (Hex '#eaff9e'), (Hex '#a3e635'), 20.0)
$g.DrawString('Talent Network', $serif2, $grad2, 70, 262)
$grad2.Dispose()
Draw-Fit $g 'For experienced professionals in global technology' $sub $muted 76 372 690
Draw-Fit $g 'sales exploring their next opportunity.' $sub $muted 76 406 690

$cxp = 940; $cyp = 300; $r = 122
$pen = New-Object System.Drawing.Pen((Hex '#ccff00'), 4)
foreach ($n in @(@(-1,-1), @(1,-1), @(-1,1), @(1,1))) {
  $nx = $cxp + $n[0] * $r; $ny = $cyp + $n[1] * $r
  $g.DrawLine($pen, ($cxp + $n[0] * 34), ($cyp + $n[1] * 34), ($nx - $n[0] * 26), ($ny - $n[1] * 26))
  $g.FillEllipse($lime, ($nx - 24), ($ny - 24), 48, 48)
}
$g.FillEllipse($lime, ($cxp - 32), ($cyp - 32), 64, 64)
$pen.Dispose()

Add-Footer 'tahsintazwar.com/talent-network'
Save-Card 'og-talent.png'

# ------------------------------------------------------------ fresher card
New-Card
Draw-Tracked $g 'FRESHER  /  EARLY CAREER' $kick $orange 78 148 3
Draw-Fit $g 'Build Your Career In' $h2 $white 70 190 690
$gr3 = New-Object System.Drawing.Rectangle(70, 262, 560, 90)
$grad3 = New-Object System.Drawing.Drawing2D.LinearGradientBrush($gr3, (Hex '#eaff9e'), (Hex '#a3e635'), 20.0)
$g.DrawString('Global Tech Sales', $serif2, $grad3, 70, 262)
$grad3.Dispose()
Draw-Fit $g 'For people who seriously want to build themselves' $sub $muted 76 372 690
Draw-Fit $g 'in global technology sales.' $sub $muted 76 406 690

$capPen = New-Object System.Drawing.Pen((Hex '#ff8a2b'), 7)
$capPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$cx2 = 950; $cy2 = 292
$diamond = @(
  (New-Object System.Drawing.Point(($cx2), ($cy2 - 92))),
  (New-Object System.Drawing.Point(($cx2 + 132), ($cy2 - 28))),
  (New-Object System.Drawing.Point(($cx2), ($cy2 + 36))),
  (New-Object System.Drawing.Point(($cx2 - 132), ($cy2 - 28)))
)
$g.DrawPolygon($capPen, $diamond)
$g.DrawArc($capPen, ($cx2 - 84), ($cy2 - 44), 168, 168, 20, 140)
$g.DrawLine($capPen, ($cx2 - 84), ($cy2 - 6), ($cx2 - 84), ($cy2 + 44))
$g.DrawLine($capPen, ($cx2 + 84), ($cy2 - 6), ($cx2 + 84), ($cy2 + 44))
$capPen.Dispose()

Add-Footer 'tahsintazwar.com/talent-network/fresher'
Save-Card 'og-fresher.png'
