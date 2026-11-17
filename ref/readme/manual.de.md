# Das Gitty-Handbuch

[English](manual.md) · [简体中文](manual.zh-CN.md) · [日本語](manual.ja.md) · [한국어](manual.ko.md) · [Français](manual.fr.md) · **Deutsch** · [Español](manual.es.md) · [Русский](manual.ru.md) · [Português](manual.pt.md)

Alles, was Gitty tut, Bereich für Bereich. Das [README](../../README.md) ist die
Kurzfassung — was es ist, warum es existiert, wie man es installiert — und bleibt
das; hier leben die Details.

> **Übersetzt am 2026-11-18, entspricht Gitty v0.2.3.**
> Das [englische Handbuch](manual.md) ist die offizielle Fassung und die einzige,
> die weiter gepflegt wird. Dieses Dokument ist eine Momentaufnahme davon; wo
> beide sich widersprechen, gilt das Englische. Die Oberfläche selbst ist
> englisch, deshalb bleiben Schaltflächen- und Menünamen im Original.

---

## Das Fenster <a id="the-window"></a>

Vier Bereiche in der Mitte, darüber eine Titelleiste, darunter eine Tab-Leiste.

### Titelleiste <a id="title-bar"></a>

Von links nach rechts beschreibt sie das aktive Repository und handelt dann daran:

- **Gitty** — das Symbol und der Name ganz links öffnen den **About**-Dialog:
  Version, Build-Zeit, Autor sowie die Versionen von Electron, Chromium und
  Node, mit Links zur Startseite und zu den
  [Tastenkürzeln](#keyboard-shortcuts).
- **‹ › ▾** — wo du in diesem Repository gewesen bist. Siehe
  [Zurückgehen](#going-back).
- **Der Repository-Pfad** ist eine Schaltfläche: sie öffnet das Menü der
  [zuletzt geöffneten Repositories](#recent-repositories).
  **+** am Ende der [Tab-Leiste](#tabs) und <kbd>Strg+O</kbd> öffnen dasselbe
  Menü.
- **⎇ Branch** ist ebenfalls eine Schaltfläche — der Branch, den git ausgecheckt
  hat, und ein Menü aller anderen zum Lesen. Siehe
  [einen anderen Branch durchsehen](#browsing-another-branch).
- **`origin/main ↑2 ↓0`** — der Upstream des ausgecheckten Branches und wie weit
  er voraus und zurück ist. Fehlt bei einem Branch, der nichts verfolgt.
- **`3 changes`** — wie viele Dateien im Arbeitsverzeichnis nicht committet sind;
  dieselbe Zahl, die die Zeile **Changes** im Commit-Bereich trägt.
- **Panes ▾** — jeden der vier Bereiche ein- oder ausblenden; siehe
  [Vollbild und Ausblenden](#full-screen-and-hiding).
- **Settings** — der Einstellungsdialog ([Einstellungen](#settings)), auch über
  <kbd>Strg+,</kbd>.
- **Refresh** — Status und Log von Hand neu einlesen (<kbd>F5</kbd> /
  <kbd>Strg+R</kbd>). Gitty beobachtet das Repository und aktualisiert von selbst;
  das hier ist für die Fälle, die das Beobachten nicht sieht — unter Linux wird
  ein Arbeitsverzeichnis mit mehr als etwa 8.000 Verzeichnissen nur teilweise
  beobachtet.

Während man einen anderen Branch liest, zeigt die Branch-Schaltfläche
`⎇ main › other-branch`, und Fehler des letzten Git-Befehls erscheinen rot neben
den Zählern.

### Zurückgehen <a id="going-back"></a>

Historie zu lesen heißt umherzustreifen: ein Commit, eine Datei darin, ein
weiterer Commit zwei Seiten tiefer im Log, dann zurück zum ersten. Die drei
Schaltflächen links in der Titelleiste merken sich dieses Herumstreifen, so wie
ein Browser.

- **‹** (<kbd>Alt+←</kbd>) kehrt zu dem Ort zurück, den man vor diesem
  betrachtet hat, und **›** (<kbd>Alt+→</kbd>) geht zu dem, von dem man
  weggegangen ist. Beide sind grau, wenn es nirgendwo hinzugehen gibt, und wenn
  man über eine fährt, nennt sie den Ort, zu dem sie einen bringen würde.
- **▾** listet die Orte selbst, die jüngsten zuerst, mit einem Punkt auf dem,
  bei dem man gerade ist. Einen auszuwählen springt direkt hin.

Ein *Ort* ist alles, was die beiden oberen Bereiche gezeigt haben: die
Ansicht — die nicht committeten Änderungen, ein Commit, ein Bereich aus zwei
Commits, eine Momentaufnahme — die darin gewählte Datei und das neben dem Diff
geöffnete Dokument. Ein Haltepunkt liest sich als `Changes`,
`7bb7787 — Refresh screenshot batches`, `src/main/git.ts @ 7bb7787` oder
`blame: src/main/git.ts @ 7bb7787`, und dorthin zurückzukehren bringt dieselbe
Datei in derselben Revision wieder auf den Schirm, statt nur den Commit erneut
auszuwählen.

Die Historie gehört dem Repository, nicht dem Fenster: jeder Tab merkt sich seine
eigenen fünfzig jüngsten Orte, und zwischen den Tabs zu wechseln wechselt, durch
welche die Schaltflächen gehen. Über Neustarts hinweg wird sie nicht behalten.

### Tabs <a id="tabs"></a>

Eine Tab-Leiste am unteren Rand hält jedes geöffnete Repository — seinen
Basisnamen, einen gelben Punkt, wenn das Arbeitsverzeichnis nicht committete
Änderungen hat, und ein **×** zum Schließen. Der Punkt zählt alles, was
`git status` meldet, unversionierte Dateien eingeschlossen, und seinen Platz
verdient er sich auf den Tabs, die man gerade *nicht* ansieht: das aktive
Repository sagt bereits `3 changed` in der Titelleiste, während ein Tab im
Hintergrund vollständig verborgen ist — der Punkt ist also das einzige Zeichen,
dass dort noch Arbeit liegt. Fährt man über einen Tab, nennt er das Repository
und sagt es in Worten.

**+** (und <kbd>Strg+O</kbd>) öffnet ein weiteres Repository in einem neuen Tab,
über das Menü der [zuletzt geöffneten Repositories](#recent-repositories); die Titelleiste zeigt stets das aktive. Jeder Tab behält seine eigenen Bereiche
und sein Terminal, sodass ein Commit, den man gerade liest, und eine laufen
gelassene Shell genau dort sind, wo sie waren, wenn man weg- und zurückwechselt.
Einen Tab an eine neue Stelle in der Leiste zu ziehen ordnet die Repositories um.
Ein Rechtsklick auf einen Tab bietet **Rename tab…** — der Name wird für dieses
Repository gemerkt, in der Tab-Leiste und der Titelleiste gezeigt, der echte Pfad
bleibt im Hover-Text —, **Open in File Manager**, das das Wurzelverzeichnis des
Repositories öffnet, und **Close repository**. Den letzten Tab zu schließen
hinterlässt ein leeres Fenster mit einer Schaltfläche für das nächste Repository.

Die Tabs, die beim Beenden von Gitty offen sind, werden beim nächsten Start
wieder geöffnet — das Repository, mit dem es gestartet wurde, wird trotzdem der
aktive Tab, und eines, das inzwischen gelöscht wurde, fällt stillschweigend weg.
**Reopen last session** in den Einstellungen schaltet das ab. Bei mehreren
Fenstern (**Instances: Multiple**) wird die Sitzung des zuletzt geschlossenen
Fensters behalten.

Das Fenster zu schließen oder Gitty zu beenden, während mehr als ein Repository
offen ist, fragt vorher nach, damit ein verirrtes <kbd>Strg+Q</kbd> nicht die
ganze Sammlung mitnimmt. Ein einzelnes offenes Repository schließt ohne Frage.

### Zuletzt geöffnete Repositories <a id="recent-repositories"></a>

Der Repository-Pfad in der Titelleiste ist ein Menü der zuvor geöffneten
Repositories — Basisname samt übergeordnetem Verzeichnis — das jüngste zuerst.

- **Klick** — in einem neuen Tab öffnen.
- **Strg/Cmd+Klick** oder **Mittelklick** — im aktuellen Tab öffnen, das dortige
  Repository ersetzen und den Platz des Tabs in der Leiste behalten.
- Das **×** rechts an einem Eintrag — ihn aus der Liste nehmen; ein Rechtsklick auf den Eintrag tut dasselbe. Das Menü bleibt offen,
  sodass sich mehrere hintereinander löschen lassen.

Das Menü zeigt die zwölf jüngsten; **More…** am unteren Rand listet den Rest.
Das Suchfeld oben filtert beim Tippen die ganze Liste — jedes Wort muss im Namen
des Repositories oder in seinem Verzeichnis vorkommen, und Treffer im Namen kommen
zuerst. <kbd>↑</kbd>/<kbd>↓</kbd> bewegen, <kbd>Enter</kbd> öffnet in einem neuen
Tab, <kbd>Strg+Enter</kbd> im aktuellen, <kbd>Esc</kbd> schließt.

Passt nichts in der Liste, sucht Gitty auf der Platte weiter: nach einem
Repository, dessen Verzeichnisname passt, an den Orten, an denen deine gemerkten
Repositories liegen — ihren übergeordneten Verzeichnissen und denen darüber, zwei
Ebenen tief, sodass `~/work/<group>/<repo>` ohne Konfiguration abgedeckt ist —
und an den üblichen Orten unter dem Home-Verzeichnis (`~/work`, `~/code`,
`~/src`, `~/projects`, …). Was es findet, steht unter *Is it one of these?* mit
vollem Pfad und öffnet sich erst, wenn du es auswählst; einmal geöffnet, kommt es
in die Liste.

**+** und <kbd>Strg+O</kbd> öffnen genau dieses Menü, sodass man ein Repository
findet, indem man seinen Namen tippt; ein zweites <kbd>Strg+O</kbd> oder
**Open Repository…** führt weiter zum Ordnerdialog.

**Open Repository…** und **Clear Recent** stehen darunter; Clear Recent fragt
nach, bevor es die Liste leert, denn das lässt sich nicht rückgängig machen. Die
Liste liegt in `~/.config/Gitty/recent-repos.json`, fasst die letzten hundert
Repositories und überspringt alle, die inzwischen verschoben oder gelöscht
wurden.

### Vollbild und Ausblenden <a id="full-screen-and-hiding"></a>

Jede Bereichskopfzeile trägt dieselben zwei Bedienelemente: **⤢** links füllt das
Fenster mit diesem Bereich, **×** rechts blendet ihn aus.

Das Vollbild deckt alles andere ab, Titel- und Tab-Leiste eingeschlossen, und die
Bereiche darunter arbeiten weiter — das Terminal läuft auch verdeckt weiter.
**⤡** in derselben Ecke, <kbd>Esc</kbd>, ein Doppelklick auf die Kopfzeile (auf
ihre leere Fläche — die Schaltflächen und das Titelmenü des Changes-Bereichs haben
ihre eigene Bedeutung) oder
<kbd>Strg+Umschalt+1</kbd> … <kbd>Strg+Umschalt+4</kbd> stellen das Layout wieder
her. Nur ein Bereich ist gleichzeitig im Vollbild.

<kbd>Strg+Tab</kbd> schiebt das Vollbild auf den nächsten Bereich in der
Layout-Reihenfolge und <kbd>Strg+Umschalt+Tab</kbd> zurück, überspringt die
ausgeblendeten und schlägt an beiden Enden um. Es wirkt nur, während ein Bereich
das Fenster füllt — genau dort, wo es gebraucht wird: mit dem Layout auf dem
Schirm ist jeder Bereich ohnehin einen Klick entfernt. Das Terminal sieht die
Taste nicht, es geht also auch aus einer Shell heraus.

Ausblenden ist die andere Richtung — jeder Bereich lässt sich wegräumen und
zurückholen:

- **Panes** in der Titelleiste listet alle vier, mit einem Punkt neben den
  sichtbaren; ein Klick schaltet um, und **Show All Panes** stellt das Layout aus
  vier Bereichen wieder her.
- <kbd>Strg+1</kbd> … <kbd>Strg+4</kbd> schalten Files, Diff, Commits und
  Terminal in dieser Reihenfolge um.
- <kbd>Strg+Umschalt+0</kbd> bringt alle vier zurück — Null für »alle«, eine
  Taste hinter den vieren, die je einen umschalten. Es braucht die Umschalttaste,
  weil <kbd>Strg+0</kbd> der Zoom-Zurücksetzen-Befehl der Browser-Engine ist, den
  das View-Menü behält.

Was übrig bleibt, teilt sich das Fenster; den Commit-Bereich auszublenden gibt
dem Diff also die volle Höhe. Der letzte sichtbare Bereich hat kein **×** — ein
leeres Fenster ließe nichts zum Anklicken übrig. Ausgeblendete Bereiche werden
über Neustarts gemerkt, und der Terminal-Bereich wird nur weggeräumt, nie
geschlossen: seine Shells laufen weiter und kommen mit ihrem Scrollback zurück.

Ein Bereich lässt sich auch wegklappen, indem man einen Trenner an den Fensterrand
zieht: der Trenner zwischen den beiden Reihen klappt jene Reihe weg, und jeder der
senkrechten Trenner klappt den Bereich auf seiner Seite weg — der Nachbar nimmt den
frei gewordenen Platz. Den Trenner zurückzuziehen stellt die Teilung wieder her.
Nützlich, wenn ein Teil des Fensters die volle Breite oder Höhe verdient.

## Die Bereiche <a id="the-panes"></a>

### Changes (oben links) <a id="changes-top-left"></a>

Die geänderten Dateien als einklappbarer Baum, jede mit ihrer Zeilenzahl neben
dem Namen. Ein ganzes Repository zu durchstöbern — das Arbeitsverzeichnis oder
die Momentaufnahme eines Commits — öffnet mit allen Verzeichnissen geschlossen,
denn das ist ein Baum zum Hinabsteigen und keine Liste zu lesender Änderungen;
eine Liste von Änderungen öffnet aufgeklappt. Auf jeder Ebene kommen
Verzeichnisse vor Dateien, und innerhalb jeder Gruppe sind Namen so sortiert,
wie es ein Leser erwartet, statt wie es ein Bytevergleich tut: die Ziffern in
einem Namen zählen als Zahl, also kommt `W9` vor `W10`, und Groß-/Kleinschreibung
ist kein Unterschied erster Ordnung, also sortiert `butler/` zu den b's statt
hinter jeden Großbuchstaben.

Jeder Name trägt ein Typ-Symbol: die Form ist die Familie — Quelltext,
strukturierte Daten, Markup, Stylesheet, Prosa, Bild, Archiv, Shell-Skript,
Lockfile, Kompilat — und die Farbe ist die Sprache, `.ts` und `.py` sind also
dieselbe Glyphe in verschiedenen Farben. Python ist die eine Sprache, die als sie
selbst gezeichnet wird, in ihrem eigenen Blau und Gelb. Eine Endung, die Gitty
nicht kennt, bekommt ein schlichtes Blatt statt einer Vermutung.

Zwei Statusspalten werden gezeigt: der Zustand im
Index (grün) und der im Arbeitsverzeichnis (gelb / rot); unversionierte Dateien
sind `??`. Die Zahl wird im Arbeitsverzeichnis von der Platte und sonst aus der
Revision gelesen; wo es keine zu lesen gibt — bei einer Binärdatei oder allem
über 8 MB —, sagt die Zeile stattdessen, wie groß die Datei ist, und eine
gelöschte Datei sagt gar nichts. Danach folgt der Änderungsumfang — wie viele Zeilen diese
Änderung in der Datei hinzugefügt und entfernt hat, `+12 −3`, gegen HEAD im
Arbeitsverzeichnis und gegen den Vorgänger bei einem Commit oder einem Bereich.
Eine Momentaufnahme ist ein Baum und keine Änderung, daher hat sie keinen
Änderungsumfang; ebenso Binärdateien oder ein Merge-Commit, dessen kombiniertes
Diff nichts zuschreibt.

Wo der Änderungsumfang stünde, nennt ein Baum — die Auflistung des Working Tree
und die Momentaufnahme eines Commits — stattdessen, **wer jede Datei zuletzt
committet hat**: eine Änderung gehört bereits jemandem, bei einem Baum aber ist
die Frage, wessen Datei das ist. Fährt man über den Namen, steht dort der ganze
Satz. Eine Datei, die git nie gesehen hat, hat keinen, unversionierte und
ignorierte Dateien zeigen also nichts.

Der Titel des Bereichs sagt, was aufgelistet ist, und ein Klick darauf öffnet ein
Menü der beiden ständigen Ansichten: **Changes**, die nicht committeten, und
**Working Tree**, jede Datei im Verzeichnis auf der Platte, nur lesbar. Ein Haken
markiert die, die auf dem Schirm ist; aus einem Commit, einem Bereich oder einer
Momentaufnahme ist dasselbe Menü der Weg zurück zu beiden.

**Working Tree** heißt jede Datei: die, die `.gitignore` abdeckt — Build-Ausgaben,
`node_modules`, was auch immer — stehen wie die übrigen in der Liste, in gedämpfter
Kursive, und ein Ordner, der nichts als ignorierte Dateien enthält, ist ebenfalls
gedämpft. Sie öffnen und lesen sich wie jede andere Datei; nur ihre Zeilenzahlen
bleiben weg, denn sie zu zählen hieße, jedes Byte eines Verzeichnisses zu lesen,
das für gewöhnlich das größte auf der Platte ist. `.git` selbst wird nicht
aufgelistet.

<kbd>Strg+B</kbd> — b wie browse — ist das Kürzel dorthin von überall her, und es
richtet das Fenster ebenso zum Lesen ein, wie es die Ansicht wechselt: Commits und
das Terminal treten beiseite und lassen den Baum und das, was er öffnet. Zurück
führt <kbd>Strg+D</kbd>: wieder die Änderungen, mit allen vier Bereichen. Im
Terminal bleibt diese Taste das Eingabeende — so verlässt man eine Shell — das Paar
funktioniert also überall sonst. Beide Tasten stehen im Hover-Text des
Bereichstitels.

- **Klick** — das Diff der Datei rechts zeigen.
- **Doppelklick** — die ganze Datei als Dokument neben dem Diff öffnen, mit
  Zeilennummern und Syntaxhervorhebung (ein gerendertes Dokument bei Markdown,
  das Bild selbst bei einem Bild).
- **Klick auf eine Statusspalte** — die Datei stagen oder, falls bereits
  gestaged, wieder unstagen.
- **Rechtsklick** — View File, Open in System App, Reveal in File Manager, Open
  Remote URL, Copy Relative Path, Copy Absolute Path, Copy File Name, Blame
  File, File History, Stage / Unstage File, Discard Changes, Delete File. Die
  Zeile eines Submoduls bietet zusätzlich **Pull Submodule**.
- **Rechtsklick → Open Remote URL** — die Seite dieser Datei auf der Website, auf
  der das Repository gehostet ist, im System-Browser geöffnet. Die Revision ist
  die, die man gerade ansieht — ein Commit, eine Momentaufnahme — und in den
  Ansichten Changes und Working Tree der ausgecheckte Branch. Die Adresse wird aus
  dem Remote auf dieselbe Weise abgeleitet wie beim
  [Eintrag im Commit-Menü](#commits-bottom-left), erscheint also nur dort, wo
  diese Ableitung gelingt, und nie bei einer unversionierten Datei, einem
  losgelösten HEAD oder einem Commit, der noch nicht gepusht wurde — die Website
  hat für ihn noch keine Seite.
- **Klick auf einen Ordner** — ein- oder ausklappen.
- **Rechtsklick auf einen Ordner** — Copy Relative Path, Copy Absolute Path, Copy
  Folder Name und die beiden Wege, ihn außerhalb von Gitty zu öffnen:
  **Open in Browser**, die Verzeichnisauflistung des Browsers selbst, und
  **Open in File Manager**. Die Momentaufnahme einer Revision listet einen Baum
  auf, der nicht auf der Platte liegt, und bietet daher nur die Pfade.
- **Rechtsklick auf die leere Fläche unter den Zeilen** — **Open in File Manager**
  für das Wurzelverzeichnis des Repositories (nicht in der Momentaufnahme einer
  Revision) und **Paste**, wenn es Dateien zum Einfügen gibt.

In einem Dateimanager kopierte Dateien lassen sich **in den Baum einfügen**: ein
Rechtsklick auf die leere Fläche unter den Zeilen gibt **Paste**, das in die
Wurzel des Repositories schreibt, ein Rechtsklick auf eine Datei gibt
**Paste into `dir`/**, das daneben schreibt. <kbd>Strg+V</kbd> tut dasselbe bei
fokussiertem Bereich — in das Verzeichnis der gewählten Datei oder in die Wurzel,
wenn nichts gewählt ist. Ausgeschnittene Dateien werden verschoben statt kopiert,
und nach einem Namen, den das Verzeichnis schon hat, wird einmal gefragt: beide
behalten, was dem ankommenden Namen ein `(copy)` anhängt, oder ersetzen.

Einfügen gehört zu den beiden Ansichten, die das Verzeichnis auf der Platte
*sind* — **Changes** und **Working Tree**. Ein Commit, ein Bereich oder die
Momentaufnahme einer Revision ist die Auflistung von etwas, das nicht da ist, um
hineinzuschreiben; also wird kein Einfügen angeboten.

<kbd>Strg+F</kbd> bei fokussiertem Bereich — oder **Filter** auf der
Such-Schaltfläche der Kopfzeile, deren Pfeil zwischen „das Repository
durchsuchen" und „diese Liste filtern" wählt — öffnet ein Filterfeld über dem
Baum und grenzt ihn auf die Pfade ein, die das Getippte enthalten, mit der Zahl,
wie viele von wie vielen Dateien übrig sind. Was man tippt, ist ein **regulärer
Ausdruck** — `\.tsx?$`, `main|renderer` — geprüft gegen den ganzen Pfad,
`src/main` behält also alles unter jenem Verzeichnis, und Groß-/Kleinschreibung
zählt nicht. Gewöhnlicher Text ist ein Ausdruck, der sich selbst meint, und ein
Ausdruck, der noch nicht kompiliert (`src/(`, die Hälfte von
`src/(main|renderer)`), wird wörtlich geprüft, statt als Fehler gemeldet zu
werden. Nichts bleibt zu, solange das Feld Text hat — ein Treffer fünf
Verzeichnisse tiefer ist ja der Sinn des Tippens. <kbd>Esc</kbd> oder das **✕**
löscht es und stellt den ganzen Baum wieder her, und ein Wechsel zu einem anderen
Commit ebenso.

<kbd>Strg+E</kbd> beantwortet die andere Frage — nicht „grenze ein, was hier
aufgelistet ist", sondern „zeig mir diese Datei, wo auch immer sie liegt". Es
öffnet von überall ein Feld über dem Fenster, ohne dass ein Bereich fokussiert
sein muss, und listet das ganze Arbeitsverzeichnis statt des Baums auf dem
Schirm: jede Datei, die `git` nennen würde, ohne die, die `.gitignore` abdeckt,
damit `node_modules` die Antwort nicht verschüttet. Die Buchstaben werden **der
Reihe nach, aber nicht zusammenhängend** geprüft — `dfpn` findet `DiffPane.tsx` —,
und die Rangfolge bevorzugt Buchstaben, die ein Wort beginnen (ein
Pfadsegment, oder nach `-`, `_`, `.` oder einem Wechsel von Klein- zu
Großbuchstaben), Buchstaben im Dateinamen statt in den Verzeichnissen darüber
und Folgen, die zusammenbleiben; bei Gleichstand gewinnt der kürzere Pfad.
<kbd>↑</kbd> <kbd>↓</kbd> wählen, <kbd>Enter</kbd> öffnet die Datei als Dokument
neben dem Diff, und <kbd>Esc</kbd> schließt das Feld. Die Datei öffnet sich so,
wie sie auf der Platte liegt, auch wenn gerade ein Commit auf dem Schirm ist, denn
das Arbeitsverzeichnis ist es, was das Feld aufgelistet hat. Die Taste wirkt auch
in einem Terminal, wo die Shell sie nicht sieht — anders als <kbd>Strg+D</kbd>,
das das Eingabeende bleibt, weil man so eine Shell verlässt; das Zeilenende von
readline liegt auch auf <kbd>End</kbd>.

**Pull Submodule** erscheint in der Zeile eines Pfads, den `.gitmodules` nennt, in
den beiden Ansichten, die das Verzeichnis auf der Platte sind — **Changes** und
**Working Tree**. Es holt das eigene Remote jenes Submoduls und setzt es auf die
Spitze des Branches, den es verfolgt (`git submodule update --init --remote`),
sodass ein nie ausgechecktes Submodul von demselben Eintrag geklont wird. Das
Superprojekt bleibt auf dem Commit stehen, den es aufgezeichnet hat, und darum
taucht das Submodul danach in **Changes** auf: den neuen Zeiger zu committen
bleibt deine Entscheidung. Was git gesagt hat, landet im Meldungsstreifen über dem
Commit-Log, dort wo Push und Pull berichten.

**Discard Changes** setzt die Datei auf das zurück, was der Index hält, nach einer
nativen Bestätigung, die klar sagt, dass es kein Zurück gibt; eine unversionierte
Datei hat keine Index-Fassung, auf die sie zurückfällt, also bietet sie stattdessen
**Delete File** an, das in den System-Papierkorb geht.

Ein Rechtsklick auf die Arbeitsverzeichnis-Zeile im Commit-Log bietet außerdem
**Copy Staged Diff**, für ein Gespräch, das in einem anderen Fenster stattfindet.

Ist ein Commit oder ein Commit-Bereich gewählt, listet dieser Bereich stattdessen
die Dateien jenes Commits; **Back to Changes** (oder <kbd>Esc</kbd>) führt
zurück. In einer [Momentaufnahme](#snapshots) listet er den gesamten Baum zu
diesem Commit, nicht nur das Geänderte. Das Arbeitsverzeichnis zu durchsehen hat
keine solche Schaltfläche — der Titel-Auswähler, aus dem es geöffnet wurde, ist
auch der Weg hinaus.

### Diff (oben rechts) <a id="diff-top-right"></a>

Unified Diff mit alten und neuen Zeilennummern, Hunk-Kopfzeilen und Färbung für
Hinzugefügtes und Gelöschtes, angeordnet als Liste von Dateien: jeder Pfad ist
eine Überschrift über die volle Breite, die Hunk-Kopfzeile ist gedämpft — sie ist
ein Zeilenbereich, nicht das, worauf man zuerst schaut — und eine Umbenennung
liest sich als `old → new`. Ohne gewählte Datei zeigt er alles auf einmal: jede
nicht committete Änderung im Arbeitsverzeichnis oder jede Datei des gewählten
Commits.

- **Show Whole Diff** — zurück zu jenem Gesamt-Diff, nachdem man eine Datei
  gewählt hat. Die Schaltfläche bleibt in der Kopfzeile und leuchtet, solange das
  ganze Diff das ist, was man ansieht. Die Arbeitsverzeichnis-Fassung deckt
  vorgemerkte und nicht vorgemerkte Änderungen zusammen ab und bindet
  unversionierte Dateien ein (bis zu 50, dann ein Hinweis), die `git diff` allein
  auslässt.
- **Wrap** — lange Zeilen umbrechen statt seitwärts scrollen. Standardmäßig an.
- **Inline** — ein Schalter wie **Wrap**: gedrückt eine Spalte mit
  `+`/`-`-Zeichen; nicht gedrückt Alt und Neu nebeneinander, wobei eine Folge von
  Löschungen mit den darauf folgenden Hinzufügungen gepaart wird. Umbrochene
  Hälften bleiben ausgerichtet.
- **Dateiüberschriften** — jede Überschrift klappt ihre Datei ein: das Dreieck
  reduziert sie auf den Namen, und **Collapse All** / **Expand All** in der
  Kopfzeile erledigen alle auf einmal. **Strg+Klick** auf eine Überschrift öffnet
  die Datei in einem neuen Dokument-Tab; per Rechtsklick gibt es **Open in a New
  Tab**, **Select in the File List**, die Pfad-Kopien und — im
  Arbeitsverzeichnis, wo die Datei auf der Platte die gezeigte Fassung ist —
  **Open in System App** und **Reveal in File Manager**. Eine Umbenennung öffnet
  ihren neuen Pfad.
- **Stage / Unstage** — solange das Diff die Arbeit einer versionierten Datei ist,
  trägt jede Hunk-Kopfzeile eine Schaltfläche, die diesen Hunk in den Index legt
  oder wieder herausnimmt. Wähle zuerst Zeilen aus, und die Schaltfläche wird zu
  **Stage 3 lines**: ein nicht gewählter Zusatz bleibt aus dem Patch, eine nicht
  gewählte Löschung wird zu einer Kontextzeile herabgestuft, und die
  Hunk-Kopfzeile wird neu berechnet — dieselbe Teilung, die `git add -p` macht, aus
  einem Fenster, in dem die ganze Datei vor einem liegt. Die Auswahl ist die
  gewöhnliche Textauswahl, ein Ziehen kopiert also weiterhin. Eine Auswahl über
  zwei Hunks gibt jedem seinen Anteil daran.
- **Unstaged / Staged** — von welcher Seite des Index eine Datei gelesen wird,
  gezeigt, sobald beide Seiten etwas enthalten. Das Stagen wirkt auf das, was auf
  dem Schirm ist. Binärdateien, Modusänderungen und Umbenennungen haben keine
  Hunks zum Wählen und werden aus der Dateiliste als Ganzes gestaged; die
  Hunk-Schaltflächen verschwinden auch, solange **Ignore whitespace** an ist, weil
  jenes Diff nicht jede Änderung enthält, die es anwenden würde.
- **Rechtsklick** — Copy Selection, Copy Whole Diff und dieselben Schalter.

Geänderte Wörter innerhalb einer geänderten Zeile werden hervorgehoben, wo sich
das besser liest als die ganze Zeile; das ist **Word highlight** in den
[Einstellungen](#settings).

Einstellungen werden über Programmläufe hinweg gemerkt. Zeilen werden in Blöcken
zu 1500 gerendert und wachsen beim Scrollen, sodass große Commits flüssig
bleiben; Diffs über 2 MB werden mit einem Hinweis abgeschnitten.

### Ganze Dateien ansehen <a id="viewing-files"></a>

Standardmäßig zeigt der Bereich ein Diff, aber jede Datei lässt sich ganz öffnen:
im Baum **doppelklicken**, **View File** / **Preview** in der Kopfzeile nutzen,
im Diff eine Dateiüberschrift **Strg+klicken** oder es aus einem der beiden
Kontextmenüs nehmen.

Die Datei öffnet als eigenes Dokument in einer Tab-Leiste *neben* dem Diff statt
darüber, sodass man sie lesen kann, ohne das Diff zu verlieren, bei dem man war.
Der Tab **Diff** steht immer zuerst, und ein einfacher Klick im Baum blättert
weiterhin an Ort und Stelle durch Diffs. Jedes Dokument merkt sich die Revision,
in der es geöffnet wurde, schließt mit seinem eigenen **×** und liest eine Datei
aus dem Arbeitsverzeichnis neu, wenn sich das Repository ändert.
Ein **Rechtsklick** auf den Tab eines Dokuments gibt dasselbe Menü, das seine
Zeile im Dateibaum hat; eine Datei, die die Liste nicht enthält — eine
unveränderte, in der Ansicht Changes —, bekommt das der Working Tree, ohne
Stagen, Verwerfen oder Löschen. Quelldateien
bekommen Zeilennummern und Syntaxhervorhebung; Markdown öffnet
[gerendert](#markdown-preview), mit einem Schalter zurück zur Quelle; HTML öffnet
[ebenfalls gerendert](#html-preview); ein Bild öffnet als [das Bild](#images).

Welche Revision man bekommt, folgt dem Bereich: die Datei auf der Platte im
Arbeitsverzeichnis, die Datei zum gewählten Commit überall sonst. Ein Dokument zu
öffnen ist eine Handlung, kein Modus — eine andere Datei oder ein anderer Commit
holt das Diff zurück — sodass der Bereich nie bei Dateien hängen bleibt, wenn man
Änderungen sehen wollte.

#### Die Gliederung einer Quelldatei <a id="the-outline-of-a-source-file"></a>

Eine Quelldatei trägt eine **Outline**-Schaltfläche, dieselbe wie ein gerendertes
Dokument: die Klassen, Funktionen und Member der Datei daneben als Baum,
eingerückt nach Verschachtelung und eingefärbt nach dem, was jedes deklariert. Ein
Klick auf einen Eintrag springt dorthin — die Datei wird weit genug gezeichnet, um
ihn zu fassen, wie tief er auch liegt — und der Eintrag, in den man gescrollt ist,
wird markiert. Der Trenner gibt der einen oder anderen Seite mehr Platz; die
Breite teilen sich alle Dateien des Repositories.

Sie liest sechzehn Sprachen — C, C++, C#, Go, Java, JavaScript, Lua, Perl, PHP,
Python, Ruby, Rust, Shell, Swift, TypeScript und die JSX-Varianten der letzten
beiden — und liest sie, indem sie Deklarationen erkennt statt zu parsen:
Kommentare und Zeichenketten werden zuerst geleert, die Verschachtelung kommt aus
der Klammertiefe (oder aus der Einrückung, wo die Sprache so geschrieben wird),
und ein Name erscheint nur dort, wo ein Schlüsselwort ihn hingesetzt hat. Alles
andere — Datenformate, Stylesheets, eine Sprache, die sie nicht kennt — zeigt gar
keine Leiste statt einer geratenen Liste. Markdown hat
[eine eigene Gliederung](#markdown-preview), aus seinen Überschriften.

#### Momentaufnahmen <a id="snapshots"></a>

Per Rechtsklick auf einen Commit und **Browse Snapshot** liest man das Repository
so, wie es bei diesem Commit war: der Bereich oben links listet den *gesamten*
Baum statt der Dateien, die dieser Commit angefasst hat, und jede Datei öffnet in
jener Revision. Eine Momentaufnahme hat kein Diff zu zeigen, also ist dort jede
Datei ein Dokument.

Die Dateien einer Momentaufnahme haben in jener Revision nie auf der Platte
existiert; darum reicht **Open in System App** eine temporäre Kopie weiter, und
**Reveal in File Manager** wird gar nicht erst angeboten. **Back to Changes**
(oder <kbd>Esc</kbd>) verlässt sie.

Eine Datei, die git als ausführbar aufgezeichnet hat — Modus `755` — bietet
außerdem **Run in the Terminal**. Das zu wählen checkt den Commit in ein
temporäres Verzeichnis aus und tippt `cd <jenes Verzeichnis> && ./<Datei>` in den
Terminal-Bereich, sodass das Programm so läuft, wie es damals war, neben den
Nachbarn, die es damals hatte, statt neben den heutigen. Die Zeile wird nur
getippt: <kbd>Enter</kbd> zu drücken ist deine Sache, und bis dahin läuft nichts.
Der Terminal-Bereich wird zurückgeholt, falls er ausgeblendet war. Das
Arbeitsverzeichnis zu durchsehen bietet denselben Eintrag und braucht keine
Kopie — der Befehl läuft im Repository selbst.

Jenes temporäre Verzeichnis ist ein echtes verknüpftes Arbeitsverzeichnis
(`git worktree`), losgelöst auf dem Commit, sodass ein Programm, das git fragt, wo
es ist, eine Antwort bekommt; es hat einen eigenen Index und ein eigenes HEAD, und
nichts, was dort läuft, rührt an dein Auschecken. Es bedeutet auch einen Eintrag
unter `.git/worktrees`, den `git worktree list` zeigt und den Gitty nebenbei
aufräumt; das Auschecken selbst wird je Commit behalten, ein zweites Ding aus
derselben Momentaufnahme zu starten geht also sofort. Ein Commit, dessen Baum über
256 MB liegt, wird abgelehnt statt ausgecheckt — der Eintrag ist dafür da, ein
Skript zu starten, nicht dafür, ein Repository voller Binärdateien in das
temporäre Verzeichnis zu schreiben.

#### Markdown-Vorschau <a id="markdown-preview"></a>

Eine `.md`-Datei auszuwählen fügt eine Schaltfläche **Preview** hinzu —
standardmäßig aus, sodass ein Diff ein Diff bleibt, bis man danach fragt. Sie
rendert die Datei als Ganzes: die Fassung auf der Platte im Arbeitsverzeichnis,
die Fassung zum gewählten Commit überall sonst.

Abgegrenzte Codeblöcke bekommen Syntaxhervorhebung, wenn sie eine Sprache nennen,
YAML-Frontmatter wird herausgelöst und als eigener hervorgehobener Block gezeigt,
und Überschriftenebenen, Listenzeichen, Links und Inline-Code sind farbcodiert,
damit sich die Struktur auf einen Blick liest.

- **Wrap** — derselbe Schalter wie beim Diff, standardmäßig an. Fließtext bricht
  immer um; in einer Vorschau entscheidet dieser Schalter, ob abgegrenzte
  Codeblöcke, breite Tabellen und lange Inline-Zeichenketten ebenfalls umbrechen,
  statt seitwärts zu scrollen.
- **Tabellenspalten** — die Spalten einer Tabelle richten sich nach ihrem Inhalt,
  und jede Grenze lässt sich ziehen: wer den rechten Rand einer Kopfzelle greift,
  dem folgt die Spalte mit dem Zeiger, die übrigen behalten ihre Breite. Eine
  Tabelle, die breiter als der Bereich ist, scrollt seitwärts. Ein Doppelklick auf
  eine Grenze gibt die Tabelle dem Browser zurück, also wieder Breiten, die zum
  Inhalt passen. Die Breiten halten, solange das Dokument offen ist.
- **Outline** — die Überschriftenstruktur neben dem Dokument, nach Ebene
  eingerückt, der Überschrift folgend, zu der man gescrollt hat. Ein Klick auf
  einen Eintrag springt hin, und der Trenner zwischen ihm und dem Dokument lässt
  sich ziehen, um einer der beiden Seiten mehr Raum zu geben. Die Breite teilen
  sich alle Dokumente im Repository — sie ist eine Leseeinstellung, keine
  Eigenschaft einer einzelnen Datei — und sie hält so lange wie das Fenster, wie
  die Größen der anderen Bereiche.
- **Source lines** — standardmäßig aus und in den [Einstellungen](#settings)
  eingeschaltet: jede Überschrift, jeder Absatz, jeder Listeneintrag, jede
  Tabelle, jeder Codeblock und jedes Bild bekommt im linken Rand die
  Zeilennummer, mit der es in der Quelle beginnt. Die Nummern werden gezeichnet
  statt eingefügt, also bleiben sie aus einer Auswahl heraus, die man kopiert,
  und aus dem, was <kbd>Strg+F</kbd> durchsucht. Ist das Dokument eines, von dem
  das Diff auf dem Schirm handelt, wird die Nummer eines Blocks, den dieses Diff
  eingefügt oder geändert hat, grün auf grün gezeichnet — in den Farben, in denen
  das Diff selbst eine `+`-Zeile malt —, sodass der Rand spiegelt, was das Diff
  sagte. Ein Block gilt als geändert, wenn eine seiner Zeilen es ist, ein
  bearbeiteter Codeblock ist also markiert, auch wenn seine erste Zeile unberührt
  ist. Ein Bild, das innerhalb eines
  Satzes steht, übernimmt die Zeile seines Absatzes, da es keine eigene hat.
- **<kbd>Strg+F</kbd>** — im Dokument suchen; siehe
  [Text suchen](#finding-text).
- **Rechtsklick** — Copy Selection, Copy Markdown Source, die Schalter für
  Umbruch und Gliederung, und Show Diff Instead.

Rohes HTML im Markdown wird nicht gerendert, und ein Link ins Web öffnet im
System-Browser statt in der Anwendung. Ein Link auf eine andere Datei im
Repository — `ref/readme/manual.md`, `../README.md`, `/CHANGELOG.md` — wird hier
stattdessen verfolgt: **Strg/Cmd+Klick** öffnet diese Datei als eigenes Dokument
neben dem Diff, in derselben Revision wie das Dokument, das den Link trägt, sodass
ein README, das man bei einem alten Commit liest, zu den Dateien jenes Commits
führt. Ein `#fragment` am Ende reist mit — `manual.md#the-window` öffnet das
Handbuch bei jener Überschrift, wie es auf einer Forge täte — und eine
Überschrift, die dieses Dokument nicht hat, öffnet es einfach oben. Das Überfahren
eines solchen Links sagt das. Ein einfacher Klick tut wie bisher nichts, und ein
Link, der über die Wurzel des Repositories hinausklettert, gehört nicht dazu.

Ein Link, der stattdessen ein Verzeichnis nennt — `src/`, `ref/spec` — öffnet den
Dateibereich auf jenem Ordner, in derselben Revision: das Arbeitsverzeichnis bei
einem von der Platte gelesenen Dokument, die Momentaufnahme jenes Commits bei
einem, das bei einem Commit gelesen wurde.

Bilder, die relativ zum Dokument angegeben sind, werden aus dem Repository
gelesen — in derselben Revision wie das Dokument, sodass ein alter Commit die
Screenshots zeigt, mit denen er ausgeliefert wurde. Eines, das das Repository dort
nicht hat, hinterlässt einen gestrichelten Platzhalter mit seinem Alt-Text. Bilder
aus dem Netz werden überhaupt nicht geholt: das README eines Fremden zu lesen
sollte einen nicht bei dessen Host anmelden.

![Markdown preview](../../ref/gitty-0.1.5-markdown.png)

#### HTML-Vorschau <a id="html-preview"></a>

Eine `.html`, `.htm` oder `.xhtml`-Datei bekommt dieselbe Schaltfläche
**Preview**, und das Dokument wird gerendert statt als Quelle gezeigt — die
Fassung auf der Platte im Arbeitsverzeichnis, die Fassung zum gewählten Commit
überall sonst.

Sie rendert in einem Sandbox-Rahmen, der über `srcdoc` geladen wird, sodass die
Seite die Anwendung nie von sich selbst wegnavigieren kann. Ihre eigenen
Stylesheets gelten — Layout, Farben, Schriften gehören dem Dokument. Skripte
laufen nicht, und entfernte Bilder werden nicht geholt: der Rahmen erbt die
Content-Security-Policy der Anwendung, die keines von beiden zulässt. Eine Seite
wird gezeigt, nicht ausgeführt. **Wrap** entscheidet, ob der Rahmen für sich
scrollt oder auf seinen Inhalt wächst, sodass die ganze Seite als eine scrollt.
<kbd>Strg+F</kbd> und <kbd>Strg+Umschalt+C</kbd> funktionieren innerhalb des
Rahmens, dessen Tasten den Rest des Fensters nie erreichen.

#### JSON <a id="json"></a>

Eine `.json`-, `.geojson`-, `.topojson`- oder `.webmanifest`-Datei öffnet so, wie
die Datei sie speichert, und bekommt neben **Wrap** eine Schaltfläche **Format**:
gedrückt wird das Dokument mit zwei Leerzeichen pro Ebene neu eingerückt, sodass
eine minifizierte Datei, die als eine endlose Zeile ankommt, sich als Baum liest.
Ein erneuter Druck zeigt die Datei wieder so, wie sie gespeichert ist.

Solange das Dokument formatiert ist, trägt jedes Objekt und jedes Array, das etwas
enthält, ein **▼** neben seiner Zeilennummer: ein Klick darauf klappt diesen
Knoten weg, und die Zeile, auf der er begann, behält ein **…**, das sagt, dass
etwas fehlt. Ein Klick auf das **▶**, zu dem es wird, öffnet ihn wieder.
Faltungen verschachteln sich, ein Knoten, der in einem anderen gefaltet ist,
bleibt also gefaltet, wenn sein Elternknoten geöffnet wird, und <kbd>Strg+F</kbd>
durchsucht, was auf dem Schirm steht — die Zeilen eines gefalteten Knotens werden
gar nicht gerendert. Nichts bleibt gefaltet, wenn ein anderes Dokument geöffnet
wird oder eine Datei aus dem Arbeitsverzeichnis neu gelesen wird, nachdem sich das
Repository geändert hat: die Zeilen, die eine Faltung meinte, sind vielleicht
nicht mehr dieselben.

Nur der Leerraum zwischen den Tokens ändert sich. Zahlen behalten die Ziffern, mit
denen die Datei sie schreibt — ein Wert, zu lang für ein Double, ein zu großer
Exponent —, Schlüssel behalten ihre Reihenfolge, und ein doppelter Schlüssel
bleibt stehen. Die Schaltfläche erscheint nur, wo sich der Text als ein
vollständiges JSON-Dokument parsen lässt, sodass eine Vorlage voller Platzhalter
oder ein abgebrochener Download nichts anbietet statt einer Schaltfläche, die
nichts tut. Formatieren ist eine Art, die Datei zu lesen; zurückgeschrieben wird
nichts.

#### Bilder <a id="images"></a>

Eine `.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.ico`, `.avif` oder `.svg` öffnet
als das Bild statt als Meldung, dass es binär ist — von der Platte im
Arbeitsverzeichnis, aus dem Commit überall sonst. Es wird über einem Schachbrett
in den Bereich eingepasst, sodass Transparenz als Transparenz lesbar ist; ein
**Klick** zeigt es in Originalgröße zum Scrollen, ein weiterer passt es wieder
ein. Pixelmaße und Größe auf der Platte stehen darunter. Bilder über 12 MB werden
nicht eingebettet.

![Image preview](../../ref/gitty-0.1.5-image.png)

#### PDFs <a id="pdfs"></a>

Eine `.pdf` öffnet als das Dokument, gelesen von dem Betrachter, den die
Browser-Engine ohnehin mitbringt: Seiten an der Seite, Zoom, Drehen, eine eigene
Suche und Schaltflächen zum Drucken oder Speichern einer Kopie. In einer Revision
funktioniert es genauso — ein PDF in der Momentaufnahme eines Commits wird aus git
gelesen, sodass sich eine alte Ausgabe eines Papers so liest, wie sie damals war,
ohne etwas auszuchecken. Die Größe der Datei steht darunter. PDFs über 64 MB
werden nicht geöffnet, und der Name in der eigenen Werkzeugleiste des Betrachters
ist nicht der der Datei; das ist die Kopfzeile des Bereichs darüber.

#### Mit Git LFS gespeicherte Dateien <a id="files-stored-with-git-lfs"></a>

Eine Datei, die [Git LFS](https://git-lfs.com/) verfolgt, ist im Repository
selbst ein dreizeiliger Zeiger, die echte Datei liegt in einem Speicher daneben.
Gitty folgt dem Zeiger, sodass ein von LFS verfolgtes Bild oder PDF wie jedes
andere in der Vorschau erscheint — in einer Revision ebenso wie im
Arbeitsverzeichnis, und ob `git lfs` auf dem Rechner installiert ist oder nicht.
Wurde das Objekt nicht geholt, sagt der Bereich das, statt ein kaputtes Bild oder
einen Fehler des Betrachters zu zeigen. `git lfs pull` holt es, und danach
funktioniert die Vorschau. Die Größe neben der Datei im Baum bleibt die des
Zeigers, denn das ist es, was das Repository tatsächlich speichert.

#### Blame und Datei-Historie <a id="blame-and-file-history"></a>

Rechtsklick auf eine Datei im Baum und **Blame File** oder **File History**
wählen; beide öffnen als Dokumente neben dem Diff. Blame zeigt eine Zeile pro
Quellzeile — den Commit, seinen Autor, sein Datum und die Zeile selbst,
hervorgehoben wie im Code-Betrachter, mit einem Geviertstrich, wo eine Zeile
noch nicht committet ist — in der Revision, die man gerade betrachtet. File
History listet jeden Commit, der die Datei berührt hat, und folgt Umbenennungen;
eine Spalte zwischen Datum und Autor sagt, wie lang die Datei bei jenem Commit
war, und wie groß sie war, wo sich die Zahl nicht ermitteln lässt — bei einer
binären Revision und allem, was älter ist. Ihre Zeilen verhalten sich wie die des
Commit-Logs: ein Klick wählt eine, ein Doppelklick öffnet jenen Commit, und
Umschalt+Klick auf eine zweite Zeile zeigt das Diff der Datei zwischen den beiden
Revisionen — dieselbe Bereichsansicht, die die zweite Auswahl im Log öffnet, mit
der Datei bereits ausgewählt.

Ein Rechtsklick auf eine Blame-Zeile bietet **History of These Lines**: `git log
-L` über die Zeilen, die die Auswahl abdeckt — oder die geklickte Zeile, ohne
Auswahl — was als eigenes Dokument öffnet und jeden Commit zeigt, der sie berührt
hat, samt dem, was er ihnen angetan hat. Blame antwortet *wer zuletzt*; das hier
antwortet *wie es so weit kam*. Es verfolgt den Bereich über Umbenennungen hinweg
von selbst.

#### Im Repository suchen <a id="searching-the-repository"></a>

**Search** in der Kopfzeile des Changes-Bereichs öffnet ein Feld über der
Dateiliste und führt `git grep` aus. Der Pfeil daneben schaltet diese Schaltfläche
auf **Filter** um, die stattdessen die Dateiliste eingrenzt; das Gewählte bleibt
gewählt, und nur eines der beiden Felder ist zugleich offen. Die Treffer sind ein nach Datei
gruppiertes Dokument, Zeilennummern links hinunter; ein Klick öffnet die Datei an
jener Zeile, wobei die Zeile markiert ist.

Die Suche folgt der Revision auf dem Schirm: im Arbeitsverzeichnis liest sie, was
auf der Platte ist, uncommittete Arbeit eingeschlossen, und bei einem Commit oder
einer Momentaufnahme jene Revision — das Feld sagt, welche. Über 2000 Treffer
hört sie auf und sagt es, wie ein übergroßes Diff.

Das Feld nimmt eine Abfrage statt eines nackten Musters, in der Form, die ein
Mailprogramm allen beigebracht hat:

| Getippt | Gefunden |
| --- | --- |
| `foo bar` | Zeilen, die beide Wörter enthalten |
| `"foo bar"` | die Wendung, samt Leerzeichen |
| `-foo` | Zeilen ohne es |
| `foo in:*.py` | nur Dateien, die auf das Glob passen; `in:*.py,*.pyi` für mehrere |
| `foo -in:test/*` | jene Dateien ausgelassen |
| `foo in *.py` | dasselbe wie `in:` — ohne Doppelpunkt liest es sich nur dann als Operator, wenn ein Pfad folgt, `for x in list` bleibt also vier Wörter |

Anführungszeichen schalten die Operatoren ab; so sucht man `"in:*.py"` wörtlich.
Jeder Begriff und jedes Glob erreicht git als eigenes Argument — es wird nichts in
eine Befehlszeile eingefügt — ein regulärer Ausdruck wird also unterwegs nicht
zerlegt. Eine Abfrage, die sagt, wo zu schauen ist, aber nicht wonach (`in:*.py`
allein), läuft nicht; der Streifen sagt, dass es nichts zu suchen gibt.

### Commits (unten links) <a id="commits-bottom-left"></a>

Das Log des aktuellen Branches, in Schritten von 300 geladen und beim Scrollen
verlängert. Die erste Zeile ist **Changes** — die nicht committeten Änderungen,
mit der Zahl geänderter Dateien; sie auszuwählen holt die oberen Bereiche dorthin
zurück. **Filter** rechts in der Kopfzeile öffnet ein Filterfeld über dem Log, das
die Liste eingrenzt — entprellt — und das Ergebnis blättert auf dieselbe Weise.
Das ✕, <kbd>Esc</kbd> oder die Schaltfläche erneut räumen das Feld weg und holen
das ganze Log zurück.

Die Kopfzeile behält **Push** und **Pull**, die beiden häufig gebrauchten; alles
Übrige zum Log liegt einen Klick hinter **⋯** — **Graph**, **All Branches**,
**Gource**, wo es installiert ist, und **Open in Browser**. Die beiden Schalter
tragen in jenem Menü einen Punkt, solange sie an sind.

**Graph** zeichnet die Bahnen neben die Hashes: wo ein Branch
sich teilte, wo ein Merge landete, zu welcher Linie ein Commit gehört. Er wird aus
den Eltern jedes Commits berechnet, statt aus `git log --graph` geparst zu werden,
dessen ASCII für ein Terminal gesetzt ist. Eine Bahn behält ihre Farbe die Seite
hinunter, und die Palette ist fest — bewusst anders als beim Blame, dessen Farben
vom SHA abgeleitet sind und „wer" bedeuten. Jenseits von zehn Bahnen teilt sich
der Überlauf die letzte Spalte, umringt, sodass ein Repository mit vielen Köpfen
die Betreffzeilen nicht aus dem Bereich drängen kann. **All Branches** zeigt alle
Branches auf einmal (`git log --all`), und so sieht man zwei Branches in ihrem
liest weiterhin einen nach dem anderen.

Das Log ist nach dem **Autorendatum** geordnet, dem in der Spalte: ein Commit, der
abgespielt statt geschrieben wurde — rebased, cherry-gepickt, aus einem
gequetschten Pull Request übernommen — liest sich also zwischen den Daten, an
denen er geschrieben wurde, und nicht am Tag, an dem er landete. Was keine
Ordnung ändern kann: ein Elternteil wird immer unter seinen Kindern gezeichnet,
ein solcher Commit kann also trotzdem zwischen Zeilen sitzen, die er zeitlich
vorwegnimmt; wo das passiert, ist das Datum markiert und sein Hover-Text sagt
warum. Unter einem Filter ist die Markierung aus: die Zeile darüber ist dann nicht
der Commit davor, ein rückwärts laufendes Datum sagt also nur, dass die Zeilen
dazwischen nicht gepasst haben.

Einen Commit auszuwählen **schattiert das Log nach Abstammung**: die Zeilen, auf
denen er aufbaut, und die, die auf ihm aufbauen, bleiben wie sie sind, alles
andere tritt zurück. Das ist die eine Beziehung, die die Position nicht zeigen
kann — die Zeile direkt darüber mag auf einem anderen Branch liegen, und ein
Elternteil mag hundert Zeilen tiefer sitzen. Der Gang deckt ab, was geladen ist,
eine Abstammung über die letzte Zeile hinaus wird also so weit gezeigt, wie das
Log reicht; unter einem Filter, wo die Zeilen eine Teilmenge sind und die Ketten
dazwischen fehlen, wird nichts schattiert.

Das Dropdown daneben sagt, wonach gesucht wird:

| | |
| --- | --- |
| **Message / Author** | Die Commit-Nachricht und der Autor, unabhängig von Groß-/Kleinschreibung, als erweiterter regulärer Ausdruck — `fix\|revert` ist eines der beiden Wörter. Der Standard. |
| **Content** | gits `-S`: die Commits, in denen sich die *Anzahl der Vorkommen* des Texts geändert hat — wo er eingeführt oder entfernt wurde. Wörtlich, eine Suche voller `.` und `(` meint also jene Zeichen. |
| **Content regex** | gits `-G`: jeder Commit, dessen Diff zum Ausdruck passt — erweitert, wie im Modus darüber — einschließlich jener, die die Zeile nur herumgeschoben haben. |

Text, der noch kein Ausdruck ist — `(fix`, auf dem Weg zu `(fix|revert)` — wird in
beiden Ausdrucksmodi wörtlich gesucht, damit ein Feld, das bei jedem Tastendruck
gelesen wird, das Log nicht leert, während man zu Ende tippt.

Die beiden Inhaltsmodi beantworten die Frage, die Blame nicht kann — *welcher
Commit diese Zeile eingeführt hat* — und lesen dafür jedes Diff der Historie; das
Feld sagt also, dass gesucht wird, während sie laufen. Den Text oder den Modus zu
ändern tötet die laufende Suche; es wird nichts in eine Befehlszeile eingefügt,
ein regulärer Ausdruck erreicht git also als ein Argument.

- **Klick** oder <kbd>Enter</kbd> — diesen Commit zeigen: seine Dateien füllen
  den Bereich oben links, sein vollständiges Diff den oben rechts. Betreff,
  Autor, Datum und der vollständige Nachrichtentext des Commits erscheinen in
  einem Streifen über der Dateiliste; ist der Text lang, klappt ihn ein
  ▸-Schalter weg, sodass die Dateiliste den Platz behält.
- <kbd>Umschalt+Klick</kbd> oder <kbd>Leertaste</kbd> — einen zweiten Commit
  wählen und beide vergleichen, den älteren zuerst.
- **Strg+Klick** (<kbd>Cmd</kbd> unter macOS) — die Seite des Commits auf der
  Website öffnen, die das Repository hostet, dieselbe Adresse wie
  **Open Remote URL** weiter unten. Lässt sich keine solche Seite ermitteln, tut
  der Klick nichts und die Zeile bleibt, wie sie war.
- **↑ ↓ / j k / Bild↑ / Bild↓ / Pos1 / Ende** — den Cursor bewegen.
- **Rechtsklick** — das Diff zeigen, Hash, Kurz-Hash oder Betreff kopieren,
  [die Momentaufnahme durchsehen](#snapshots) oder gegen den gewählten Commit
  vergleichen.
- **Rechtsklick → Open in Browser** — diesen Commit im System-Browser rendern;
  **Copy Commit URL** kopiert den Link. Ein Webserver in der Anwendung liefert
  jedes offene Repository als durchklickbare Commit-Liste aus — die Schaltfläche
  **Open in Browser** im Commit-Bereich landet dort — mit Metadaten, Dateien und
  Diff jedes Commits und Diffs je Datei einen Klick entfernt.
- **Rechtsklick → Open Remote URL** — die Seite dieses Commits auf der Website,
  die das Repository hostet, im System-Browser geöffnet. Die Adresse wird aus dem
  Remote abgeleitet (dem, den der aktuelle Branch verfolgt, sonst `origin`), und
  der Eintrag erscheint nur, wenn diese Ableitung gelingt: GitHub, GitLab,
  Bitbucket, Gitea, Forgejo, Codeberg und sourcehut sind bekannt, ebenso jeder
  selbst gehostete Server, der dem Schema `/commit/<hash>` folgt. Ein Repository
  ohne Remote oder eines auf Azure DevOps bekommt den Eintrag nicht, ebenso wenig
  ein Commit, der noch nicht gepusht wurde — und Strg+Klick öffnet einen solchen
  auch nicht.

  Er lauscht auf `127.0.0.1`, und das allein wäre nicht viel: die Loopback-Adresse
  hält andere Rechner draußen, nicht andere Seiten im eigenen Browser, von denen
  jede es abrufen könnte. Also trägt jede URL ein beim Start erzeugtes und im
  Speicher gehaltenes Token — `/t/<token>/…` — das die Links, die Gitty dir reicht,
  bereits haben. Ein falsches Token ist ein 404 statt eines 403, eine Anfrage,
  deren `Host` nicht loopback ist, wird abgewiesen (das ist es, was DNS-Rebinding
  sinnlos macht), und die Seiten werden mit `Referrer-Policy: no-referrer`
  ausgeliefert, sodass ein Link aus einer Commit-Nachricht das Token nicht
  mitnimmt. Das Token ist bei jedem Start neu, also funktionieren die URLs,
  solange diese Sitzung läuft.
- Eine Datei im Bereich oben links auszuwählen verengt das Diff auf diese Datei;
  **Show Whole Diff** weitet es wieder.

![Diff against any two commits](../../ref/gitty-0.1.5-range.png)

#### Gource <a id="gource"></a>

Ist [gource](https://gource.io/) im `PATH`, bekommt das **⋯**-Menü der
Commit-Kopfzeile einen Eintrag **Gource**: sie spielt die Historie des
Repositories als Animation ab — der Verzeichnisbaum wächst, Dateien leuchten auf,
wenn ein Commit landet, ein Autor fliegt zwischen ihnen pro Name im Log. Gource
öffnet ein eigenes Fenster und läuft weiter, nachdem man Gitty geschlossen hat;
der Eintrag wartet nur lange genug, um zu sehen, dass es gestartet ist, und
zeigt, was gource gesagt hat, wenn nicht.

Es wird mit einem Tag Historie pro halber Sekunde gestartet, inaktive Dateien
bleiben auf dem Schirm und lange Lücken werden übersprungen — das ist es, was ein
echtes Repository lesbar macht statt zu einem langsamen Tröpfeln. Nichts wird für
dich installiert: wo gource nicht im `PATH` ist, ist der Eintrag schlicht
nicht da.

#### Einen anderen Branch durchsehen <a id="browsing-another-branch"></a>

Der Branch in der Titelleiste öffnet ein Menü aller lokalen und
Remote-Tracking-Branches, den mit dem neuesten Commit zuerst; einen davon zu
wählen zeigt dessen Historie. Es ist ein Blick, der nur liest: gitty führt kein
`checkout` aus, also bleiben das Arbeitsverzeichnis, seine Diffs und die
Terminals genau dort, wo git sie gelassen hat. Während man einen anderen Branch
ansieht, liest sich die Titelleiste als `⎇ main › other-branch`, und der
Commit-Bereich nennt den Branch, den er auflistet; **Back to \<branch\>** führt
zurück. Jeder der beiden Namen hat seinen eigenen Hover-Text, der sagt, welcher
welcher ist — der Unterschied ist ja der ganze Sinn der Sache. Jeder Tab sieht
für sich durch.

#### Push und Pull <a id="push-and-pull"></a>

**Push** und **Pull** sitzen in der Kopfzeile, und beide wirken auf den
ausgecheckten Branch, gleich auf welchen das Log zeigt. **Push** zählt, was
ungepusht ist — **Push 3** — und wird grau, wenn es nichts zu senden gibt; auf
einem Branch, der nichts verfolgt, veröffentlicht er den Branch auf `origin` und
setzt den Upstream. **Pull** holt per Fast-Forward vom Upstream und ist grau,
wenn es keinen gibt. Sind die Branches auseinandergelaufen, ist ein Fast-Forward
unmöglich, und Gitty fragt, ob stattdessen mit einem Rebase geholt werden soll —
die eigenen Commits über dem Upstream neu abgespielt. Wer ablehnt, lässt das
Repository, wie es war, und sieht gits Absage; wer zustimmt, braucht ein sauberes
Arbeitsverzeichnis, und ein Konflikt hält den Rebase an, damit man ihn im Terminal
zu Ende bringt. Was git sagt, erscheint über dem Log — ein Klick schiebt es weg;
Fehlschläge bleiben, bis man das tut.

Keiner von beiden kann auf eine Eingabeaufforderung antworten: hinter ihnen steht
kein Terminal, also scheitert ein Push, der ein Passwort oder eine Passphrase
will, mit gits eigener Meldung, statt hängen zu bleiben. Beides wird danach von
Hand im Terminal-Bereich zu Ende gebracht, der ja gleich daneben liegt.

### Terminal (unten rechts) <a id="terminal-bottom-right"></a>

Eine echte interaktive Login-Shell (`$SHELL`) mit Wurzel im Repository, sodass
sich jeder Git-Befehl direkt ausführen lässt. <kbd>Strg+Umschalt+C</kbd> kopiert
die Auswahl des Terminals — <kbd>Strg+C</kbd> ist dort der Interrupt und bleibt
der Interrupt. Derselbe Akkord kopiert auch in jedem anderen Bereich, ändert
seine Bedeutung also nicht, wenn der Fokus wandert. Die anderen Bereiche
aktualisieren sich automatisch, wenn sich das Repository auf der Platte ändert.
Welche Shell sie startet und ob sie als Login-Shell startet, sind
[Einstellungen](#settings); beides wird gelesen, wenn ein Terminal entsteht, also
greift eine Änderung bei der nächsten Teilung.

Der Bereich teilt sich in so viele Shells, wie man mag: **Split →** setzt eine
neue neben das fokussierte Terminal, **Split ↓** darunter, und die Trenner
dazwischen lassen sich ziehen wie bei jedem anderen Bereich. Ein Klick auf ein
Terminal fokussiert es — das umrandete ist das, wo die nächste Teilung oder
**Close** landet. Zweimal in dieselbe Richtung zu teilen verlängert die Reihe
oder Spalte, statt zu verschachteln, sodass drei nebeneinanderliegende Terminals
gegeneinander in der Größe verändert werden.

**Close** beendet die fokussierte Shell; eine Shell mit `exit` zu verlassen
schließt ihre Teilung von selbst. Das letzte Terminal bleibt immer: es zu
verlassen hinterlässt den Hinweis auf dem Schirm statt eines leeren Bereichs.

**Send** in der Kopfzeile dieses Bereichs übergibt den Index. Es tippt einen
Befehl in die fokussierte Shell und drückt Enter, und das ist alles: aus Gitty
heraus wird kein Modell aufgerufen, nichts verlässt die Maschine, das du nicht
gesendet hast. Die Prompts und die Ausgabe des Agenten erscheinen im Terminal, wo
ein echtes tty ist, also funktionieren Hooks und gpg-Signatur wie immer.

Das Feld links davon nennt den Befehl, den sie ausführen würde, und ist der Ort,
an dem ein anderer gewählt wird — es gibt keine Einstellung dafür, denn es ist
eine Frage, die einmal pro Übergabe gestellt wird, nicht einmal pro Installation.
Das Dropdown listet die Befehle, an die Gitty sich erinnert, den zuletzt
ausgeführten zuerst, und führt den aus, den du wählst; ein ausgeführter Befehl
rückt nach oben, sodass das Feld stets den zuletzt benutzten zeigt. Ist nichts
gemerkt, ist das Feld blass und **Send** ausgegraut. Das **×** rechts an einem
Eintrag nimmt ihn nach einer Bestätigung aus der Liste — die Liste ist der einzige
Ort, an dem ein Befehl festgehalten wird, und das Menü bleibt offen, sodass
mehrere hintereinander entfernt werden können. **New command…** unten öffnet ein
einzeiliges Feld, mit dem aktuellen Befehl vorbefüllt, für alles, was nicht in der
Liste steht. Die Liste beginnt mit einigen Vorschlägen — welcher Agent installiert
ist, kann Gitty nicht wissen — und ein Befehl kommt in die Liste, indem er
ausgeführt wurde; gemerkt wird also nichts aufgrund einer halb getippten Zeile.

## Text suchen <a id="finding-text"></a>

<kbd>Strg+F</kbd> durchsucht, was der rechte Bereich gerade zeigt: ein Diff, eine
Datei, ein gerendertes Markdown-Dokument, eine [HTML-Vorschau](#html-preview),
ein Blame oder die Historie einer Datei. Ist der Dateibaum fokussiert, tut es
etwas anderes — es filtert diesen Baum, beschrieben unter
[Changes](#changes-top-left). Jeder Treffer ist hervorgehoben, der
aktuelle herausgehoben, <kbd>Enter</kbd> und <kbd>Umschalt+Enter</kbd> (oder die
Pfeiltasten) gehen sie durch und schlagen an beiden Enden um, die Zählung sagt,
wo man ist, und <kbd>Esc</kbd> schließt.

Die Suche ist unabhängig von Groß-/Kleinschreibung und liest den Text so, wie er
gerendert ist, nicht das Markup dahinter — ein Ausdruck wird also über die Fett-
und Code-Spans hinweg gefunden, die Markdown hinterlässt, und ein Diff wird als
die Zeilen durchsucht, die man sieht. Ansichten, die beim Scrollen in Blöcken
rendern (eine lange Datei, ein großes Diff), rendern den Rest, wenn die
Suchleiste aufgeht, sodass die Zählung das Ganze abdeckt statt nur den bisher
gescrollten Teil. Eine eingeklappte Datei in einem Diff aus mehreren Dateien
bleibt eingeklappt und wird nicht durchsucht.

## Einstellungen <a id="settings"></a>

**Settings** in der Titelleiste, oder <kbd>Strg+,</kbd>. Alles hier gilt für jeden
Tab und wird über Neustarts gemerkt; **Restore Defaults** setzt alles zurück. Der
Dialog liegt in drei Reitern — **Appearance**, **View** und **Session** —, damit
er mit seinem Wachstum eine Bildschirmseite bleibt; die Tabelle unten listet sie
in dieser Reihenfolge.

| | |
| --- | --- |
| **Theme** | Dark oder Light. |
| **Language** | English, 简体中文, 日本語, 한국어, Français, Deutsch, Español, Русский oder Português — die Oberfläche, die Menüs und die Dialoge ändern sich alle gemeinsam, ohne Neustart. |
| **Time zone** | Die Zone, in der jedes Datum und jede Uhrzeit auf dem Schirm gerendert wird: standardmäßig die der Maschine selbst, oder UTC, oder jede Zone, die das System kennt. Git speichert jeden Commit mit dem Versatz seines Autors, also ist ein Zeitstempel immer eine Wahl der Zone — hier wird sie getroffen. Die Datumsspalte des Logs folgt ihr, was heißt, dass die Grenze zwischen „heute" und einem Datum mitwandert. |
| **Time format** | Absolut (eine Uhrzeit oder ein Datum) oder relativ (`28m ago`, `2h ago`). Relativ umgeht die Zonenfrage ganz; der Hover-Tipp auf einer Zeile bleibt in jedem Fall absolut und nennt seine Zone. |
| **Font size** | 9 – 20, in halben Punkten. Gilt für jeden Bereich, das Terminal eingeschlossen. |
| **Monospace font** | Die Schriftfamilie, in der die Bereiche und das Terminal gezeichnet werden, gewählt aus den auf dieser Maschine gefundenen Monospace-Schriften. **System default** ist der eingebaute Stapel (JetBrains Mono, Fira Code, DejaVu Sans Mono, …). |
| **Row height** | 18 – 26 Pixel — die Zeilenhöhe, auf der jede Liste aufbaut: Dateibaum, Log und Diff. Enger passt mehr auf den Schirm, weiter liest sich leichter. |
| **Diff layout** | Inline oder Side-by-Side, derselbe Schalter, den die Diff-Kopfzeile trägt. |
| **Context lines** | 0 – 25 unveränderte Zeilen um jeden Hunk — gits `-U`, dessen eigener Standard 3 ist. Weiter, um zu sehen, worin eine Änderung sitzt; enger, um mehr von einem großen Diff auf den Schirm zu bekommen. |
| **Ignore whitespace** | Aus, Betrag (gits `-b`: eine Reihe von Leerzeichen, die die Länge ändert, ist keine Änderung) oder Alles (`-w`: kein Leerraumunterschied zählt). Neu eingerückter oder umbrochener Code liest sich als unverändert statt als eine Wand aus Rot und Grün. Die `+12 −3`-Zählungen der Dateiliste folgen derselben Einstellung, können also keine Zeilen behaupten, die das Diff dann nicht zeigt. |
| **Word wrap** | Lange Zeilen umbrechen statt seitwärts scrollen. |
| **Word highlight** | Die Wörter markieren, die sich innerhalb einer geänderten Zeile geändert haben, nicht nur die Zeile. |
| **Outline** | Die Gliederung neben einem Dokument zeigen: Überschriften in einem gerenderten, Klassen und Funktionen in einer Quelldatei. |
| **Markdown source lines** | Jeden Block eines gerenderten Dokuments mit der Zeile nummerieren, mit der er in der Quelle beginnt. Überschriften, Absätze, Listeneinträge, Tabellen, Codeblöcke und Bilder tragen alle eine, in einem Rand links hinunter. Standardmäßig aus. |
| **File sorting** | Natürliche oder Byte-Reihenfolge. Natürlich liest die Ziffern eines Namens als Zahl (`W9` vor `W10`) und stellt Groß-/Kleinschreibung an zweite Stelle; Byte-Reihenfolge ist gits eigene, wo jeder Großbuchstabe vor jedem Kleinbuchstaben sortiert. |
| **Reopen last session** | Die Repositories wieder öffnen, die beim letzten Beenden der Anwendung offen waren. Das Repository, mit dem Gitty gestartet wurde, bleibt der aktive Tab; inzwischen gelöschte werden still fallengelassen. |
| **Instances** | **Single** — der Standard — hält ein Gitty je Nutzer: `gitty <repo>` aus jedem Verzeichnis reicht das Repository an das bereits offene Fenster, das es als Tab hinzufügt und nach vorn kommt, und der zweite Start endet sofort. **Multiple** öffnet stattdessen für jeden Start ein eigenes Fenster. Anders als der Rest der Tabelle wird dies von der Anwendung und nicht vom Fenster gehalten, ist also für jedes Fenster gleich; eine Änderung wirkt beim nächsten getippten `gitty`, nicht beim nächsten Neustart. |
| **Shell** | Die Shell, die ein Terminal startet, aufgelistet aus `/etc/shells` plus den üblichen Pfaden (`COMSPEC` und PowerShell unter Windows). **System default** ist `$SHELL`. Ein Pfad, der inzwischen weg ist, fällt darauf zurück, statt einen toten Bereich zu hinterlassen. |
| **Login shell** | Sie mit `-l` starten, damit das Profil des Nutzers geladen wird. Abschalten für eine schnellere, stillere Shell — keine Profilausgabe, keine Prüfungen beim Login. Windows-Shells haben kein solches Flag und ignorieren dies. |

### Plugins <a id="plugins"></a>

Der letzte Einstellungs-Tab. Alles, was nicht der Kern eines Historien-Browsers
ist, lebt hier als Plugin: mit eigenem Schalter, eigenen Einstellungen, eigenen
Dateien. Alle beginnen abgeschaltet.

| Plugin | was es tut |
| --- | --- |
| **Semantic reading** | Ein Sprachanalysator liest die Prosa eines gerenderten Markdown-Dokuments und unterstreicht die Eigennamen darin — Namen von Personen, Orten und Organisationen — sodass sich ein Absatz danach überfliegen lässt, um wen und um wo es geht. Lateinische Wörter in CJK-Prosa (`GPT-4`, `Claude`, `v0.1.9` in einem chinesischen Satz) bekommen eine eigene Farbe statt einer Linie, und das Ende jedes Satzes bekommt Gewicht und ein wenig Luft dahinter, sodass ein Absatz sich auf einen Blick in Sätzen zählen lässt. Beides braucht keinen Analysator, beides gilt also auch, wenn keiner antworten kann. Das Markup bleibt unangetastet, ebenso der Code: ein abgegrenzter Block, eine Inline-Code-Spanne und ein Linkziel werden nie markiert. |

Semantic reading hat drei eigene Einstellungen, sichtbar sobald es an ist.
**Analyser** ist, wer liest: **jieba** segmentiert den Text auf dieser Maschine,
braucht weder Netz noch Schlüssel und kann Chinesisch; **Model** schickt den Text
an den OpenAI-kompatiblen Endpunkt, den `Model access` nennt, was einen Umlauf je
Dokument kostet und jede Sprache liest, die das Modell liest. So oder so lässt ein
Analysator, der nicht antworten kann, das Dokument genau so, wie es war.

**Mark styles** öffnet `rules.json`, das sagt, wie jede Art Markierung aussieht:
`underline` (`none`, `solid`, `dotted`, `dashed`, `double`, `wavy`),
`underlineColor`, `color`, `background`, `bold`, `italic` und `spaceAfter`, je ein
Eintrag für `person`, `place`, `org`, `proper`, `latin` und `sentence-end`.
`spaceAfter` ist zusätzliche Luft nach der Markierung, in em, bis 2 — genau das
gibt der Standard einem Satzende, statt noch einer Farbe. Farben sind `#rgb`,
`#rrggbb` oder `#rrggbbaa` und gehören zum dunklen Thema — die Datei hat keine
zweite Palette für das helle. Bearbeiten, das Dokument neu öffnen, und die
Änderung ist da.

**Model access** öffnet `models.json`: `baseUrl`, `model` und Schlüssel für den
Analysator **Model**. `apiKeyEnv` nennt eine Umgebungsvariable, aus der der
Schlüssel gelesen wird, was ihn aus der Datei heraushält; `apiKey` hält ihn
direkt, für alle, denen das lieber ist. Beide Dateien liegen in Gittys eigenem
Zustandsverzeichnis unter `plugins/semantic-reading/`, nie in einem Repository,
und ihr Inhalt verlässt nie den Hauptprozess.

**Shell** und **Login shell** werden gelesen, wenn ein Terminal entsteht; sie wirken
also bei der nächsten Teilung oder dem nächsten Repository-Tab, nicht in den
bereits laufenden Shells. **Word wrap**, **Diff layout** und **Outline**
sind dieselben Schalter, die die Diff-Kopfzeile trägt: eine Änderung an einer
Stelle wirkt an beiden. **Word highlight** gibt es nur hier.

## Tastenkürzel <a id="keyboard-shortcuts"></a>

<kbd>F1</kbd> zeigt diese Tabelle in der Anwendung — **Help ▸ Keyboard
Shortcuts** öffnet dasselbe Blatt.

| Taste | Aktion |
| --- | --- |
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>Bild↑</kbd> <kbd>Bild↓</kbd> / <kbd>Pos1</kbd> <kbd>Ende</kbd> | Die Auswahl in der Commit-Liste bewegen |
| <kbd>Enter</kbd> | Den gewählten Commit zeigen |
| <kbd>Space</kbd> / <kbd>Shift+Click</kbd> | Einen zweiten Commit markieren und das Paar vergleichen |
| <kbd>Ctrl+Click</kbd> auf einen Commit | Seine Seite auf der hostenden Website öffnen |
| <kbd>Ctrl+Click</kbd> auf eine Dateiüberschrift | Diese Datei in einem neuen Dokument-Tab öffnen |
| <kbd>Strg+F</kbd> | Im Diff, in der Datei oder worin auch immer der Bereich zeigt, suchen — oder den Dateibaum filtern, wenn dieser Bereich fokussiert ist |
| <kbd>Strg+C</kbd> / <kbd>Strg+Umschalt+C</kbd> | Die Auswahl kopieren, überall im Fenster |
| <kbd>Esc</kbd> | Zurück zu den nicht committeten Änderungen |
| <kbd>Strg+B</kbd> | Das Arbeitsverzeichnis durchsehen, Commits und Terminal treten beiseite |
| <kbd>Strg+D</kbd> | Zurück zu den Änderungen, mit allen vier Bereichen (nicht im Terminal, wo es das Eingabeende ist) |
| <kbd>Strg+V</kbd> | Die Dateien der Zwischenablage in den Dateibaum einfügen, wenn dieser Bereich fokussiert ist |
| <kbd>Alt+←</kbd> / <kbd>Alt+→</kbd> | Zurück und vorwärts durch die besuchten Orte |
| <kbd>Alt</kbd> | Die Menüleiste der Anwendung ein- oder ausblenden (nicht unter macOS, wo sie immer da ist) |
| <kbd>F1</kbd> | Die Tastenkürzel, als Blatt über dem Fenster |
| <kbd>F5</kbd> / <kbd>Strg+R</kbd> | Status und Log aktualisieren |
| <kbd>Strg+O</kbd> | Ein weiteres Repository in einem neuen Tab öffnen: das Menü der zuletzt geöffneten Repositories; erneut für den Ordnerdialog |
| <kbd>Strg+E</kbd> | Eine Datei nach Namen öffnen, von überall im Fenster — das Terminal eingeschlossen |
| <kbd>Strg+,</kbd> | Einstellungen |
| <kbd>Strg+1</kbd> … <kbd>Strg+4</kbd> | Files, Diff, Commits, Terminal aus- oder einblenden |
| <kbd>Strg+Umschalt+0</kbd> | Alle vier Bereiche wieder anzeigen |
| <kbd>Strg+Umschalt+1</kbd> … <kbd>Strg+Umschalt+4</kbd> | Das Fenster mit diesem Bereich füllen |
| <kbd>Strg+Tab</kbd> / <kbd>Strg+Umschalt+Tab</kbd> | Das Vollbild geht zum nächsten Bereich, oder zum vorigen |

## Plattform-Hinweise <a id="platform-notes"></a>

### Linux-Desktop-Integration <a id="linux-desktop-integration"></a>

Die beiden Kompromisse unten haben dieselbe Ursache — eine Electron-Anwendung,
die *ausgeführt* statt paketiert wird — also sind beide im `.deb` verschwunden,
und beide bleiben auf dem `setup.sh`-Weg, der wirklich ein unverpacktes Electron
ausführt.

**Fensterklasse.** Der Desktop-Eintrag, den `setup.sh` schreibt, trägt
`StartupWMClass=electron`: das meldet ein unverpacktes Electron, egal wie die
Anwendung sich nennt, und dagegen gleichen Fensterliste und Dock ein Fenster ab,
um sein Symbol zu finden. Der Nebeneffekt ist, dass eine andere unverpackte
Electron-Anwendung derselben Sitzung sich Gittys Symbol borgt. Der paketierte
Build hat seine eigene ausführbare Datei, sein Eintrag passt also auf `gitty`, und
die Kollision kann nicht passieren.

**Sandbox.** `run.sh` und `cli.js` setzen `ELECTRON_DISABLE_SANDBOX=1`, weil
`chrome-sandbox` kein root-gehöriges setuid-Bit innerhalb von `node_modules`
behalten kann. Das `.deb` hat nichts zu umgehen: sein `postinst` setzt den Helfer
auf Kerneln ohne unprivilegierte User-Namespaces auf 4755, lässt ihn auf 0755, wo
die Namespace-Sandbox funktioniert, und installiert das AppArmor-Profil, das
Ubuntu 24.04 verlangt. Für alles, was aus dem Paket installiert wird, ist die
Sandbox also an.

Das `.AppImage` ist das schwächere von beiden: nichts an ihm kann ein setuid-Bit
tragen, also hängt es von unprivilegierten User-Namespaces ab — die die
AppArmor-Richtlinie von Ubuntu 24.04 standardmäßig einschränkt. Erwarte, dort
`--no-sandbox` zu übergeben oder ein eigenes AppArmor-Profil zu installieren.
Bevorzuge das `.deb`, wo du kannst.

### Wayland und unterschiedlich skalierte Monitore <a id="wayland-and-monitors-scaled-differently"></a>

Eine GNOME-Wayland-Sitzung mit zwei unterschiedlich skalierten Monitoren kann
Chromium daran hindern, sich auf einen Wert festzulegen: es kippt den
Skalierungsfaktor des Fensters mehrmals pro Sekunde zwischen beiden hin und her,
setzt bei jedem Kippen die Seite neu und die ganze Oberfläche zittert um ein, zwei
Pixel, solange das Fenster offen ist. Im Vollbild zeigt es sich am deutlichsten.
Nichts an Gitty verursacht es — ein Electron-Fenster ganz ohne Inhalt zittert
genauso — und keine Fenstergröße entgeht ihm.

Gitty nimmt es einem ab: beim Start fragt es, wie die Monitore skaliert sind, und
kommen zwei Antworten zurück, startet es sich selbst mit abgeschalteter
fraktionaler Skalierung von Chromium neu. Das geschieht, bevor ein Fenster
existiert, zu sehen ist also nichts außer einem etwas späteren Start. Der Preis
ist, dass die fraktionale Skalierung des Desktops dann ignoriert wird — die
Oberfläche wird mit Skalierung 1 gezeichnet und wirkt kleiner als der Rest des
Desktops. <kbd>Strg+=</kbd> zoomt sie zurück, und die Schriftgrößen in
**Settings** sind der andere Weg, den Unterschied auszugleichen.

Zwei Umgebungsvariablen übergehen die Vermutung.
`GITTY_DISABLE_FRACTIONAL_SCALE=1` schaltet die fraktionale Skalierung ab, was
immer die Monitore sagen — nützlich, wenn der zweite Monitor erst nach dem Start
von Gitty angesteckt wird, der eine Fall, den die Prüfung beim Start nicht fangen
kann. `GITTY_DISABLE_FRACTIONAL_SCALE=0` lässt sie an und unterbindet den
Neustart, Zittern inklusive.

Beide Monitore in **Settings → Displays** auf dieselbe Skalierung zu setzen lässt
Chromium nichts, wozwischen es kippen könnte — dieselbe Behebung vom anderen Ende
her, dort wo zwei Bildschirme sich eine Skalierung teilen können.

Eine Folge des Neustarts: die Prozess-ID, die `run.sh` ausgibt, gehört dem
Prozess, der zur Seite getreten ist, und benennt einen Augenblick später nichts
mehr.

### macOS-App-Bundle <a id="macos-app-bundle"></a>

`Gitty.app` ist ein Wrapper, kein Paket: `Contents/MacOS/Gitty` ist ein
zweizeiliges Skript, das `run.sh --fg --any` per exec ausführt. `--fg` ist
wichtig — exec bis ganz nach unten bedeutet, dass das Dock-Symbol beim Bundle
bleibt, statt von einem Prozess verwaist zu werden, der es überlebt — und
`--any` lässt einen Start aus dem Finder, der kein sinnvolles
Arbeitsverzeichnis hat, auf die zuletzt geöffneten Repositories zurückfallen.

Der Name stimmt an allen drei Stellen, an denen er auftaucht, und nur eine davon
kommt aus dem Bundle. Finder und Dock lesen `CFBundleName` und `CFBundleIconFile`
aus `Info.plist`; die Menüleiste ist `app.name`, den `app.setName('Gitty')`
setzt, bevor ein Fenster existiert, und `{ role: 'appMenu' }` als
Beschriftung verwendet. Anders als beim Linux-Fensterklassen-Problem oben ist
hier also nichts ein Kompromiss — weshalb Paketieren nichts außer Signieren
einbrächte und weshalb `electron-builder.yml` nur Linux-Ziele konfiguriert.

Ein aus dem Finder gestartetes Bundle erbt launchds minimalen `PATH`, ohne nvm
und ohne Homebrew, und `run.sh` braucht `node` und `npm`, um neu zu bauen, wenn
das Bundle veraltet ist. `setup.sh` löst sie zur Installationszeit auf und
stellt sie voran — als Präfix, sodass ein Start aus dem Terminal unbeeinflusst
bleibt. Ein späterer Wechsel der Node-Version lässt diesen Pfad veralten;
`setup.sh` erneut auszuführen korrigiert ihn.

### Windows <a id="windows"></a>

Windows läuft aus einem Checkout, über dasselbe `run.sh` und `setup.sh` wie die
anderen Plattformen, ausgeführt von Git Bash, das mit
[Git for Windows](https://gitforwindows.org/) kommt. Das README listet die
[Schritte](../../README.md#on-windows). Nichts wird paketiert:
`electron-builder.yml` konfiguriert nur Linux-Ziele.

**Was `setup.sh` installiert.** Ein Symlink nützt hier nichts, denn `ln -s` von
Git Bash legt stillschweigend eine Kopie an, und eine Kopie von `run.sh` sucht den
Checkout neben sich selbst. Also bekommt `%USERPROFILE%\.local\bin` stattdessen
zwei kleine Wrapper: `gitty`, ein Bash-Skript für Git Bash, und `gitty.cmd` für
cmd und PowerShell, das seine Argumente an Gits `bash.exe -l` weiterreicht. Das
`-l` bringt Gits eigene Werkzeuge in den `PATH`; `CHERE_INVOKING=1` hält das
Login-Profil davon ab, ins Home-Verzeichnis zu wechseln, sodass `gitty` weiterhin
das aktuelle meint. Git Bash baut seinen `PATH` aus dem von Windows, ein einziger
Eintrag für jenes Verzeichnis dient also jeder Shell, und `setup.sh` gibt die
PowerShell-Zeile aus, die ihn hinzufügt, wenn er fehlt.

Startmenü und Desktop bekommen eine `Gitty.lnk`, die `run.sh --any` in einem
minimierten Git-Bash-Fenster ausführt. Dieses Fenster schließt sich, sobald
Electron gestartet ist. Ihr Symbol ist `build/icon.png`, verpackt in eine `.ico`
unter `%LOCALAPPDATA%\Gitty`. Das Log ist
`%USERPROFILE%\.local\state\gitty\gitty.log`, derselbe Pfad wie anderswo.

**Kein Visual Studio.** Das `node-pty` des Terminal-Bereichs liefert für Windows
vorgebaute N-API-Binärdateien mit, die unter jedem Electron laden, deshalb
überspringt der `postinstall`-Schritt das `electron-rebuild`, das er unter Linux
und macOS ausführt. Dieser Neubau bräuchte die C++-Werkzeuge von Visual Studio und
scheiterte ohne sie.

**_not a valid Win32 application_ bei `npm install`.** Das heißt, dass die
64-Bit-Visual-C++-Laufzeitumgebung fehlt, nicht dass ein Download kaputt ist. Ohne
sie sucht Windows `vcruntime140.dll` entlang des `PATH`, und eine 32-Bit-Kopie,
die irgendein anderes Programm dort hinterlassen hat (meist ein 32-Bit-Python),
lässt sich nicht in ein 64-Bit-Node laden. Die Laufzeitumgebung mit
`winget install Microsoft.VCRedist.2015+.x64` installieren und `npm install`
erneut ausführen.

**_dubious ownership_.** Auf einem Laufwerk, das keine Dateibesitzer aufzeichnet,
etwa FAT/exFAT oder manche Netzwerkfreigaben, verweigert git ein Repository, von
dem es nicht beweisen kann, dass es dir gehört, und Gitty zeigt dafür nichts an.
Dem Repository, oder jedem Repository auf jenem Laufwerk, in gits eigener
Konfiguration vertrauen:

```bash
git config --global --add safe.directory D:/path/to/repo
git config --global --add safe.directory '*'   # every repository
```

**Das Terminal** startet `COMSPEC`, also `cmd.exe`, sofern nicht **Settings →
Shell** PowerShell oder eine andere Shell wählt. **Login shell** bewirkt hier
nichts.

**Zeilenenden.** Git for Windows checkt Text standardmäßig mit CRLF aus, und bash
liest ein abschließendes CR als Teil des Befehls. `.gitattributes` hält `*.sh` bei
jedem Checkout auf LF. Ein Checkout, der entstand, bevor es diese Datei gab,
übernimmt sie, sobald die beiden Skripte erneut ausgecheckt werden, mit
`rm run.sh setup.sh && git checkout -- run.sh setup.sh`.

### Wenn das Fenster einfriert <a id="when-the-window-freezes"></a>

Gitty führt ein Protokoll seiner eigenen Hänger: Immer wenn der Hauptprozess oder
das Fenster eine halbe Sekunde oder länger nicht reagiert, hält eine JSON-Zeile
fest, wie lange, und welche Git-Aufrufe in dem Moment liefen. Aus einem Checkout
gestartet, liegt das Protokoll unter `logs/stalls/<date>.jsonl` darin (von git
ignoriert); paketiert unter `~/.config/Gitty/logs/stalls/`. Die Datei des
betreffenden Tages an einen Fehlerbericht über ein Einfrieren anzuhängen sagt
mehr, als eine Beschreibung es kann. `GITTY_STALL_MS=200` senkt die Schwelle.
