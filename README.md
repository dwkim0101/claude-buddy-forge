# Claude Buddy Forge

Interactive Claude Code buddy reroller with animated ASCII art previews. Browse species in a visual grid, customize rarity/shiny/eyes/hats, then patch your local Claude launcher.

## Quick Install

```bash
npx claude-buddy-forge
```

Or install globally:

```bash
npm install -g claude-buddy-forge
claude-buddy-forge
```

Or one-liner install:

```bash
curl -fsSL https://raw.githubusercontent.com/dwkim0101/claude-buddy-forge/main/install.sh | sh
```

## Features

- 18 species with animated ASCII art (3 frames each)
- Interactive grid catalog with real-time animation
- 5 rarities: common, uncommon, rare, epic, legendary
- 6 eye styles, 8 hat options, shiny variants
- Ultra preset (legendary shiny dragon + tinyduck hat)
- Arrow key navigation with visual previews
- Automatic backup and restore

## What It Needs

- Node.js 18+
- A locally installed Claude launcher
- Permission to edit your local Claude launcher and `~/.claude.json`

## Commands

```bash
claude-buddy-forge guided       # Interactive flow with animated previews
claude-buddy-forge catalog      # Browse all species in a grid
claude-buddy-forge current      # Show your current buddy
claude-buddy-forge apply --rarity legendary --shiny --species dragon --eye "◉" --hat tinyduck
claude-buddy-forge restore      # Restore original buddy
```

## Guided Flow

`guided` will:

1. Show an animated title banner
2. Let you choose Ultra preset or Custom build
3. Pick rarity with probability display
4. Toggle shiny mode with visual comparison
5. Browse all 18 species in an animated grid
6. Preview each eye style on your chosen species
7. Try on different hats
8. Show final preview with stats
9. Search for a matching salt and patch the launcher

## Restore

The first successful patch creates a stable backup:

```bash
<launcher>.buddy-orig.bak
```

Restore with:

```bash
claude-buddy-forge restore
```

## Notes

- This is not an official Claude Code workflow.
- It patches your local launcher, so updates may overwrite it.
- After patching, fully restart Claude Code.

---

# 한국어 가이드

Claude Code 컴패니언 버디를 원하는 모습으로 커스터마이징하는 인터랙티브 CLI 도구입니다.

## 빠른 설치

```bash
npx claude-buddy-forge
```

또는 글로벌 설치:

```bash
npm install -g claude-buddy-forge
claude-buddy-forge
```

또는 원라이너 설치:

```bash
curl -fsSL https://raw.githubusercontent.com/dwkim0101/claude-buddy-forge/main/install.sh | sh
```

## 주요 기능

- 18종의 캐릭터를 애니메이션 그리드로 미리보기
- 5단계 레어리티: common, uncommon, rare, epic, legendary
- 6종류의 눈, 8종류의 모자, 샤이니 변형
- 울트라 프리셋 (전설급 샤이니 드래곤 + 작은오리 모자)
- 화살표 키로 탐색, 실시간 미리보기
- 자동 백업 및 복원 기능

## 필요 조건

- Node.js 18 이상
- 로컬에 설치된 Claude launcher
- Claude launcher 및 `~/.claude.json` 편집 권한

## 명령어

```bash
claude-buddy-forge guided       # 인터랙티브 가이드 모드
claude-buddy-forge catalog      # 전체 종 그리드 보기
claude-buddy-forge current      # 현재 버디 확인
claude-buddy-forge apply --rarity legendary --shiny --species dragon --eye "◉" --hat tinyduck
claude-buddy-forge restore      # 원래 버디로 복원
```

## 가이드 플로우

`guided` 모드 실행 시:

1. 애니메이션 타이틀 배너 표시
2. 울트라 프리셋 또는 커스텀 빌드 선택
3. 레어리티 선택 (확률 표시)
4. 샤이니 모드 토글 (시각적 비교)
5. 18종 캐릭터를 애니메이션 그리드에서 선택
6. 눈 스타일 미리보기 및 선택
7. 모자 미리보기 및 선택
8. 최종 프리뷰 (스탯 포함)
9. 매칭 솔트 검색 후 런처 패치

## 복원

첫 패치 시 안정 백업이 자동 생성됩니다:

```bash
<launcher>.buddy-orig.bak
```

복원 명령:

```bash
claude-buddy-forge restore
```

## 주의사항

- 이 도구는 공식 Claude Code 워크플로우가 아닙니다.
- 로컬 런처를 패치하므로 업데이트 시 덮어쓸 수 있습니다.
- 패치 후 Claude Code를 완전히 재시작해야 합니다.
