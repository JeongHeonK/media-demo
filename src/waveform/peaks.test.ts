import { expect, test } from "vitest";
import { computePeaks } from "./peaks";

test("반환 배열 길이가 구간 수와 같다", () => {
  const { min, max } = computePeaks(new Float32Array(100), 7);
  expect(min).toHaveLength(7);
  expect(max).toHaveLength(7);
});

test("한 주기 사인파를 4구간으로 나누면 첫 구간 max 가 1 에 가깝고 셋째 구간 min 이 -1 에 가깝다", () => {
  const n = 1000;
  const samples = Float32Array.from({ length: n }, (_, i) =>
    Math.sin((2 * Math.PI * i) / n),
  );
  const { min, max } = computePeaks(samples, 4);
  expect(max[0]).toBeCloseTo(1, 2);
  expect(min[2]).toBeCloseTo(-1, 2);
});

test("샘플 10개를 3구간으로 나누면 마지막 구간이 마지막 샘플 값을 포함한다", () => {
  const samples = new Float32Array(10);
  samples[9] = 0.75;
  const { max } = computePeaks(samples, 3);
  expect(max[2]).toBe(0.75);
});

test("샘플 [0.5, -0.5] 를 4구간으로 나누면 max 가 [0.5, 0.5, -0.5, -0.5] 다", () => {
  const { max } = computePeaks(Float32Array.of(0.5, -0.5), 4);
  expect(Array.from(max)).toEqual([0.5, 0.5, -0.5, -0.5]);
});

test("빈 샘플이면 min 과 max 가 모두 0 이다", () => {
  const { min, max } = computePeaks(new Float32Array(), 3);
  expect(Array.from(min)).toEqual([0, 0, 0]);
  expect(Array.from(max)).toEqual([0, 0, 0]);
});
