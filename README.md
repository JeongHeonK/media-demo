# media-demo

브라우저에서 오디오를 디코딩해 파형을 그리고, 클릭한 위치부터 재생합니다.

https://jeongheonk.github.io/media-demo/waveform/

## 흐름

```
File / 샘플 fetch -> ArrayBuffer
  -> decodeAudioData -> 채널마다 getChannelData(c)
  -> computePeaks(channels, canvas.width)  // 픽셀마다 전체 채널의 min, max
  -> OffscreenCanvas 에 한 번 그림
  -> RAF: drawImage + 재생 위치선 (AudioContext.currentTime 기준)
  -> 클릭: xToTime 으로 seek, 새 AudioBufferSourceNode.start(0, offset)
  -> 키보드: 화살표 ±5%, Home/End (keySeekTime)
```

- `src/waveform/peaks.ts`, `timeline.ts`: 순수 함수이며 Vitest 로 테스트합니다.
- `src/waveform/WaveformPage.tsx`: 디코딩, 그리기, 재생을 담당합니다.

## 메모

- min/max 를 따로 저장합니다. 파형이 0 기준으로 대칭이 아니기 때문입니다.
- canvas 폭은 `clientWidth * devicePixelRatio` 입니다. peak 개수도 같은 값이라 HiDPI 에서 흐려지지 않습니다.
- `AudioBufferSourceNode` 는 한 번만 `start` 할 수 있어서 재생·seek 마다 새로 만듭니다.
- 파일을 연달아 고르면 마지막 파일만 반영합니다 (`pickRef`).
- `decodeAudioData` 는 파일 전체를 메모리에 올립니다. 1시간 스테레오 44.1kHz 파일이면 약 1.27GB 입니다. 긴 파일은 peak 를 미리 계산하거나 Worker 로 넘겨야 합니다.

## 실행

```sh
pnpm install
pnpm dev
pnpm test
```

`main` 에 PR 이 머지되면 GitHub Actions 로 Pages 에 배포됩니다.
