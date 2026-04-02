# Claude Buddy Forge 🔨

> Interactive CLI to customize your Claude Code companion buddy with animated ASCII art previews.
>
> **[🇰🇷 한국어 가이드는 아래에 있습니다](#-한국어-가이드)**

## What is Claude Buddy?

When you use [Claude Code](https://claude.ai/code), a small ASCII art companion sits beside your input box — that's your **buddy**. Each buddy is randomly generated based on your account ID and a salt value, determining its species, rarity, eyes, hat, and whether it's shiny.

**Claude Buddy Forge** lets you take control: browse all 18 species, pick your exact combination, and patch your local Claude launcher to get the buddy you actually want.

```
    /^\  /^\       (\__/)        /\_/\
   <  ◉  ◉  >    ( ✦  ✦ )     ( ✦   ✦)
   (   ~~   )    =(  ..  )=    (  ω  )
    `-vvvv-´      (")__(")     (")_(")
   ★★★★★ LEGENDARY   ★★★★ EPIC    ★★★ RARE
```

## Quick Install

```bash
# Just run it (no install needed)
npx claude-buddy-forge

# Or install globally
npm install -g claude-buddy-forge

# Or one-liner install
curl -fsSL https://raw.githubusercontent.com/dwkim0101/claude-buddy-forge/main/install.sh | sh
```

## Preview

### Title Screen
```
╔══════════════════════════════════════════════════╗
║                                                  ║
║   ✦  C L A U D E   B U D D Y   F O R G E  ✦    ║
║                                                  ║
║       Interactive Companion Reroller              ║
║                                                  ║
╚══════════════════════════════════════════════════╝

   ✦ Press Enter to start ✦

   18 species • 6 eyes • 8 hats • 5 rarities
```

### Mode Selection
```
⚡ Choose Your Mode ⚡

╔════════════════════════════╗  ╭────────────────────────────╮
║   ⭐ ULTRA PRESET ⭐       ║  │   🎨 CUSTOM BUILD 🎨       │
║                            ║  │                            │
║      /^\  /^\              ║  │      /\_/\                 │
║     <  ◉  ◉  >            ║  │     ( ✦   ✦)               │
║     (   ~~   )             ║  │     (  ω  )                │
║      `-vvvv-´              ║  │     (")_(")                │
║                            ║  │                            │
║   Legendary + Shiny        ║  │   Choose everything        │
║   Dragon + Tinyduck        ║  │   Your way                 │
╚════════════════════════════╝  ╰────────────────────────────╯

← → Navigate  │  Enter Select  │  Esc Back
```

### Species Grid (Animated!)
```
✦ Choose Your Species ✦
Rarity: legendary  │  18 species available

╔══════════════════╗ ╭──────────────────╮ ╭──────────────────╮
║      __          ║ │      (·>         │ │    .----.        │
║    <(◉ )___      ║ │      ||          │ │   ( ·  · )       │
║     (  ._>       ║ │    _(__)_        │ │   (      )       │
║      `--´        ║ │     ^^^^         │ │    `----´        │
║    ▸DUCK         ║ │  goose           │ │  blob            │
╚══════════════════╝ ╰──────────────────╯ ╰──────────────────╯
╭──────────────────╮ ╭──────────────────╮ ╭──────────────────╮
│    /\_/\         │ │    /^\  /^\      │ │    .----.        │
│   ( ·   ·)       │ │   <  ·  ·  >    │ │   ( ·  · )       │
│   (  ω  )        │ │   (   ~~   )    │ │   (______)       │
│   (")_(")        │ │    `-vvvv-´     │ │   /\/\/\/\       │
│  cat             │ │  dragon         │ │  octopus         │
╰──────────────────╯ ╰──────────────────╯ ╰──────────────────╯
                        ...and 12 more

↑ ↓ ← → Navigate  │  Enter Select  │  Esc Back
```

### Final Preview
```
⚡ Final Preview ⚡

╔═══════════════════════════════════════════════════╗
║                                                   ║
║      ,>            Rarity: LEGENDARY ★★★★★        ║
║     /^\  /^\       Species: dragon                 ║
║    <  ◉  ◉  >     Eyes: ◉                         ║
║    (   ~~   )      Hat: tinyduck                   ║
║     `-vvvv-´       Shiny: ✨ YES                   ║
║                                                   ║
║   ✨ DRAGON ✨      ─── Stats Preview ───           ║
║                    DEBUGGING  ████████████░░░░ 65  ║
║                    PATIENCE   ██████████░░░░░░ 50  ║
║                    CHAOS      ██████████████░░ 72  ║
║                    WISDOM     ██████████░░░░░░ 50  ║
║                    SNARK      ████████░░░░░░░░ 42  ║
║                                                   ║
║                    Probability: ~1 in 864,000      ║
╚═══════════════════════════════════════════════════╝

⏎ Press Enter to search & patch
```

## Authentication & Login

Claude Buddy Forge automatically detects your Claude account using both methods:

- **OAuth login** — reads `oauthAccount.accountUuid` from your Claude config
- **Legacy login** — reads `userID` as fallback

The tool searches both `~/.claude.json` and `~/.claude/.config.json`.

> **⚠️ Important:** You must log in to Claude Code at least once before using this tool. If no account is detected, you'll see an error asking you to run `claude` and complete login first.

## Features

- **18 species** with animated ASCII art (3 frames each)
- **Interactive grid catalog** with real-time animation
- **5 rarities**: common (60%), uncommon (25%), rare (10%), epic (4%), legendary (1%)
- **6 eye styles**: · ✦ × ◉ @ °
- **8 hat options**: none, crown, tophat, propeller, halo, wizard, beanie, tinyduck
- **Shiny variants** with sparkle effects (1% chance per roll)
- **Ultra preset**: legendary shiny dragon + tinyduck hat
- Arrow key navigation with visual previews
- Automatic backup and restore

## What It Needs

- Node.js 18+
- **Claude Code 2.1.89+** (the buddy companion system was introduced in this version)
- Claude Code **logged in at least once**
- Permission to edit your local Claude launcher and `~/.claude.json`

## ⚠️ Before You Start

1. **Quit Claude Code completely** before running this tool. The launcher file must not be in use while patching.
2. Run `claude-buddy-forge` in a **regular terminal** (not inside Claude Code's terminal).
3. After patching, **restart Claude Code** to see your new buddy.
4. If a Claude Code update resets your buddy, just run the tool again — your preferences are quick to re-apply.
5. The tool **automatically creates a backup** of your launcher on first patch. You can always restore with `claude-buddy-forge restore`.

## Commands

```bash
claude-buddy-forge guided       # Interactive flow with animated previews (default)
claude-buddy-forge catalog      # Browse all species in a grid
claude-buddy-forge current      # Show your current buddy
claude-buddy-forge apply --rarity legendary --shiny --species dragon --eye "◉" --hat tinyduck
claude-buddy-forge restore      # Restore original buddy
```

## Guided Flow

1. Animated title banner
2. Choose Ultra preset or Custom build
3. Pick rarity with probability display
4. Toggle shiny mode with visual comparison
5. Browse all 18 species in an animated grid
6. Preview each eye style on your chosen species
7. Try on different hats
8. Final preview with stats and probability
9. Search for a matching salt and patch the launcher

## Restore

The first successful patch creates a stable backup:

```
<launcher>.buddy-orig.bak
```

Restore with:

```bash
claude-buddy-forge restore
```

## Species Catalog

```
 1. duck        5. dragon      9. turtle      13. capybara    17. mushroom
 2. goose       6. octopus    10. snail       14. cactus      18. chonk
 3. blob        7. owl        11. ghost       15. robot
 4. cat         8. penguin    12. axolotl     16. rabbit
```

## Notes

- This is not an official Claude Code workflow.
- It patches your local launcher, so Claude updates may overwrite it.
- After patching, fully restart Claude Code.
- The tool is self-contained — no external data files needed.

---

# 🇰🇷 한국어 가이드

Claude Code를 사용할 때 입력창 옆에 작은 ASCII 아트 캐릭터가 있습니다 — 이것이 **버디(buddy)**입니다. 각 버디는 계정 ID와 솔트 값으로 랜덤 생성되어 종, 레어리티, 눈, 모자, 샤이니 여부가 결정됩니다.

**Claude Buddy Forge**는 18종의 캐릭터를 미리 보고, 원하는 조합을 선택해서 로컬 Claude 런처를 패치하는 인터랙티브 CLI 도구입니다.

## 빠른 설치

```bash
# 설치 없이 바로 실행
npx claude-buddy-forge

# 글로벌 설치
npm install -g claude-buddy-forge

# 원라이너 설치
curl -fsSL https://raw.githubusercontent.com/dwkim0101/claude-buddy-forge/main/install.sh | sh
```

## 인증 & 로그인

이 도구는 Claude 계정을 자동으로 탐지합니다:

- **OAuth 로그인** — `oauthAccount.accountUuid` 사용
- **레거시 로그인** — `userID` 사용 (폴백)

`~/.claude.json`과 `~/.claude/.config.json` 모두 탐색합니다.

> **⚠️ 중요:** 이 도구를 사용하기 전에 Claude Code에 최소 한 번은 로그인해야 합니다. 계정이 감지되지 않으면 `claude` 명령어로 로그인을 완료하라는 안내가 표시됩니다.

## 주요 기능

- **18종** 캐릭터를 애니메이션 그리드로 미리보기
- **5단계 레어리티**: common (60%), uncommon (25%), rare (10%), epic (4%), legendary (1%)
- **6종류 눈**: · ✦ × ◉ @ °
- **8종류 모자**: none, crown, tophat, propeller, halo, wizard, beanie, tinyduck
- **샤이니 변형** — 반짝이 효과 (확률 1%)
- **울트라 프리셋** — 전설급 샤이니 드래곤 + 작은오리 모자
- 화살표 키 탐색, 실시간 미리보기
- 자동 백업 및 복원

## 필요 조건

- Node.js 18 이상
- **Claude Code 2.1.89 이상** (버디 컴패니언 시스템이 이 버전에서 도입되었습니다)
- Claude Code **최소 1회 로그인 완료**
- Claude launcher 및 `~/.claude.json` 편집 권한

## ⚠️ 사용 전 확인사항

1. 이 도구를 실행하기 전에 **Claude Code를 완전히 종료**하세요. 패치 중에 런처 파일이 사용 중이면 안 됩니다.
2. **일반 터미널**에서 실행하세요 (Claude Code 내부 터미널이 아닌).
3. 패치 후 **Claude Code를 재시작**해야 새 버디가 보입니다.
4. Claude Code 업데이트로 버디가 초기화되면, 다시 실행하면 됩니다 — 금방 다시 적용할 수 있습니다.
5. 첫 패치 시 **런처 백업이 자동 생성**됩니다. 언제든 `claude-buddy-forge restore`로 복원 가능합니다.

## 명령어

```bash
claude-buddy-forge guided       # 인터랙티브 가이드 모드 (기본)
claude-buddy-forge catalog      # 전체 종 그리드 보기
claude-buddy-forge current      # 현재 버디 확인
claude-buddy-forge apply --rarity legendary --shiny --species dragon --eye "◉" --hat tinyduck
claude-buddy-forge restore      # 원래 버디로 복원
```

## 가이드 플로우

1. 애니메이션 타이틀 배너
2. 울트라 프리셋 또는 커스텀 빌드 선택
3. 레어리티 선택 (확률 표시)
4. 샤이니 모드 토글 (시각적 비교)
5. 18종 캐릭터를 애니메이션 그리드에서 선택
6. 눈 스타일 미리보기 및 선택
7. 모자 미리보기 및 선택
8. 최종 프리뷰 (스탯 + 확률)
9. 매칭 솔트 검색 후 런처 패치

## 복원

첫 패치 시 안정 백업이 자동 생성됩니다:

```
<launcher>.buddy-orig.bak
```

복원:

```bash
claude-buddy-forge restore
```

## 주의사항

- 이 도구는 공식 Claude Code 워크플로우가 아닙니다.
- 로컬 런처를 패치하므로 Claude 업데이트 시 덮어쓸 수 있습니다.
- 패치 후 Claude Code를 완전히 재시작해야 합니다.
- 외부 데이터 파일 없이 자체 포함된 도구입니다.
