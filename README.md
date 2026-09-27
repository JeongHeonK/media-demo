# media-demo

오디오 파일을 브라우저에서 디코딩해 파형을 그리고, 클릭한 위치부터 재생하는 WebAudio 데모다.

- 데모: https://jeongheonk.github.io/media-demo/waveform/
- 스택: React, TypeScript, Vite(multi-page), Vitest, Biome, pnpm, plain CSS

## 동작 흐름

```
<input type="file">
  -> File.arrayBuffer()
  -> AudioContext.decodeAudioData()          // AudioBuffer (PCM float32)
  -> AudioBuffer.getChannelData(0)           // Float32Array
  -> computePeaks(samples, canvas.width)     // 가로 픽셀마다 { min, max }
  -> OffscreenCanvas 에 x 마다 fillRect      // 파형은 한 번만 그린다
  -> requestAnimationFrame 루프
       drawImage(파형) + 재생 위치 표시선
       위치 = timeToX(playbackTime(ctx.currentTime, startedAt, offset, duration))
  -> canvas 클릭
       xToTime(x, canvas.width, duration)
       재생 중이면 기존 source.stop() 후 새 AudioBufferSourceNode.start(0, time)
```

- 파일 선택, 디코딩, 그리기, 재생은 `src/waveform/WaveformPage.tsx` 가 맡는다.
- 계산은 순수 함수 두 파일로 분리했다. `src/waveform/peaks.ts` 가 `computePeaks` 를, `src/waveform/timeline.ts` 가 `xToTime`, `timeToX`, `playbackTime` 을 가진다.
- `AudioBufferSourceNode` 는 `start()` 를 한 번만 호출할 수 있다. 그래서 재생, 일시정지 후 재개, seek 마다 새 노드를 만들어 `start(0, offset)` 한다.
- 재생이 끝나면 RAF 루프를 멈추고 재생 위치를 0 으로 되돌린다.

## 설계 결정과 이유

**min 과 max 를 둘 다 저장한다.** 파형은 0 을 기준으로 위아래가 대칭이 아니다. 절댓값 최대 하나만 저장하면 한쪽으로 치우친 파형이 대칭으로 그려진다. 그래서 픽셀마다 `max` 로 위 끝, `min` 으로 아래 끝을 그린다.

**구간 공식은 빈 구간을 만들지 않는다.** 샘플 n 개를 구간 b 개로 나눌 때 i 번째 구간은 `[floor(i*n/b), max(start+1, floor((i+1)*n/b)))` 다.
- b ≤ n 이면 각 구간의 끝이 다음 구간의 시작과 같다. 모든 샘플이 정확히 한 구간에 들어간다.
- b > n 이면 `start+1` 이 구간마다 샘플을 최소 1개 넣는다. 샘플이 없는 구간은 min/max 가 `Infinity`/`-Infinity` 로 남기 때문이다.
- 샘플이 0 개이면 모든 값이 0 인 배열을 돌려준다.

**canvas 는 CSS 폭 × `devicePixelRatio` 로 잡는다.** `canvas.width = clientWidth * devicePixelRatio` 로 설정하고, peak 구간 수도 이 값을 쓴다. 그래서 물리 픽셀 하나에 peak 하나가 대응하고, HiDPI 화면에서도 파형이 흐려지지 않는다. 재생 위치 표시선 두께도 `devicePixelRatio` 를 곱한다.

**파형은 한 번만 그리고 프레임마다 복사한다.** 파일을 로드할 때 `OffscreenCanvas` 에 픽셀 열마다 `fillRect` 를 한 번씩 호출해 파형을 그린다. RAF 루프는 매 프레임 `drawImage` 로 파형을 복사하고, 그 위에 재생 위치 표시선만 새로 그린다. 매 프레임 canvas 폭만큼(예: 880px × 2 = 1760번) `fillRect` 를 다시 호출하지 않는다.

**재생 위치는 `AudioContext.currentTime` 으로 계산한다.** 이 값은 오디오를 렌더링하는 클럭이라 실제 소리와 같이 간다. context 가 suspended 이면 이 값도 멈춘다. `Date.now()` 나 `performance.now()` 는 별도 클럭이라 소리와 어긋날 수 있다. 계산식은 `playbackTime = min(now - startedAt + offset, duration)` 이다.

**늦게 끝난 이전 디코딩은 버린다.** 파일을 고를 때마다 `pickRef` 카운터를 올린다. `decodeAudioData` 가 끝났을 때 카운터가 바뀌었으면 결과를 버린다. 그래서 파일 A 다음에 B 를 골랐는데 A 의 디코딩이 늦게 끝나도 화면은 B 를 보여준다. 디코딩이 끝나면 `stop()` 을 한 번 더 호출한다. 디코딩 중에 이전 파일을 재생했다면 이 호출이 그 소리를 멈춘다.

**suspended context 는 Play 클릭에서 `resume()` 한다.** 브라우저 autoplay 정책 때문에 `AudioContext` 가 suspended 상태로 생길 수 있다. context 는 파일 선택 후에 만들어진다. 그래서 사용자 제스처인 Play 클릭 안에서 state 를 확인하고 `resume()` 을 호출한다.

**같은 파일을 다시 고를 수 있게 input 값을 비운다.** file input 은 값이 같으면 `change` 이벤트를 다시 보내지 않는다. 그래서 `handleFile` 에서 파일을 읽은 직후 `e.target.value = ""` 로 비운다.

**`prefers-reduced-motion` 을 따른다.** 파형이 처음 나타날 때 기본은 300ms 동안 왼쪽에서 오른쪽으로 드러나는 `clip-path` 애니메이션이다. reduced-motion 설정이면 200ms fade 로 바꾸고, 버튼을 누를 때 줄어드는 효과도 끈다.

## 한계와 확장

**메모리.** `decodeAudioData` 는 파일 전체를 float32 PCM 으로 메모리에 올린다.
- 1시간 스테레오 44.1kHz 파일이면 44100 × 3600 × 2 × 4 B ≈ 1.27 GB 다.
- `decodeAudioData` 는 결과를 AudioContext 의 sampleRate 로 리샘플링한다. context 가 48kHz 이면 같은 파일이 약 1.38 GB 가 된다.
- 지금 코드는 긴 파일을 나눠 디코딩하지 않는다.

**채널.** 파형은 `getChannelData(0)`, 즉 첫 채널만 그린다. 스테레오의 오른쪽 채널은 파형에 반영되지 않는다. 재생은 모든 채널을 그대로 재생한다.

**peak 계산 위치.** `computePeaks` 는 샘플을 한 번씩 훑는다. 44100 × 600 샘플(10분 모노)을 Node 에서 돌렸을 때 약 15ms 걸렸다. 지금은 메인 스레드에서 계산한다. 확장한다면 두 가지 방법이 있다.
- Worker 로 옮긴다. `getChannelData` 의 `Float32Array` 버퍼를 `postMessage(data, [data.buffer])` 로 transfer 하면 복사 없이 넘긴다.
- 서버나 업로드 시점에 peak 를 미리 계산해 파일과 함께 내려준다. 영상 편집기처럼 같은 소스를 여러 번 여는 경우에 맞다.

**줌.** 지금은 전체 길이를 canvas 폭 하나에 맞춰 한 번만 계산한다. 줌을 지원하려면 둘 중 하나가 필요하다.
- 보이는 구간 `[t0, t1]` 의 샘플만 잘라 `computePeaks` 를 다시 호출한다.
- 해상도별 peak(예: 256, 1024, 4096 샘플당 1쌍)를 미리 만들어 두고 줌 배율에 맞는 단계를 고른다.

**RMS.** min/max 는 순간 최댓값이라 짧은 클릭음도 크게 보인다. 체감 음량을 보여주려면 구간별 RMS 를 함께 계산해 안쪽에 겹쳐 그리면 된다. 지금은 구현하지 않았다.

## 테스트

Vitest(environment `node`)는 순수 함수만 검사한다. 테스트는 11개다.
- `computePeaks` (5개): 반환 길이, 사인파의 max/min, 나누어떨어지지 않을 때 마지막 샘플 포함, 구간 수 > 샘플 수, 빈 입력
- `xToTime` (2개): 가운데 클릭, 캔버스 밖 클릭의 0/duration 고정
- `playbackTime` (2개): 시작 직후 offset, duration 상한
- `timeToX` (2개): 끝 시간, 중간 비율

브라우저에서 직접 확인해야 하는 항목이 있다. 이유는 `node` 환경에 해당 API 가 없기 때문이다.
- canvas 에 실제로 찍힌 픽셀, `devicePixelRatio` 에 따른 선명도
- `AudioContext` 의 디코딩, 재생 타이밍, suspended 상태
- 클릭 좌표를 canvas 좌표로 바꾸는 계산, 애니메이션과 reduced-motion

그래서 계산을 순수 함수로 빼서 테스트하고, `WaveformPage.tsx` 에는 브라우저 API 호출과 순서만 남겼다.

## 실행

```sh
pnpm install
pnpm dev        # 개발 서버, http://localhost:5173/media-demo/waveform/
pnpm test       # vitest run
pnpm check      # biome check .
pnpm typecheck  # tsc --noEmit
pnpm build      # vite build -> dist/
```

배포는 `.github/workflows/deploy.yml` 이 맡는다.
- `main` 에 push 하거나 수동으로 실행하면 `pnpm build` 결과인 `dist` 를 GitHub Pages 에 올린다.
- `vite.config.ts` 의 `base: "/media-demo/"` 가 Pages 경로와 맞춰져 있다.
- 저장소 Settings > Pages > Source 를 "GitHub Actions" 로 설정해야 배포된다.

## 다음

WebCodecs 로 영상 프레임을 디코딩하고 WebGL 셰이더로 효과를 입히는 `/video-shader` 페이지를 계획하고 있다. 아직 만들지 않았다.
