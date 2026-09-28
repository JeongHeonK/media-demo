import { expect, test } from "vitest";
import { keySeekTime, playbackTime, timeToX, xToTime } from "./timeline";

test("캔버스 가운데를 누르면 전체 길이의 절반 시간을 돌려준다", () => {
  expect(xToTime(50, 100, 8)).toBe(4);
});

test("캔버스 왼쪽 밖을 누르면 0, 오른쪽 밖을 누르면 전체 길이를 돌려준다", () => {
  expect(xToTime(-10, 100, 8)).toBe(0);
  expect(xToTime(130, 100, 8)).toBe(8);
});

test("재생 시작 직후 재생 시간은 offset 과 같다", () => {
  expect(playbackTime(12, 12, 3, 8)).toBe(3);
});

test("재생 시간은 전체 길이를 넘지 않는다", () => {
  expect(playbackTime(20, 10, 3, 8)).toBe(8);
});

test("끝 시간은 캔버스 폭에 대응한다", () => {
  expect(timeToX(8, 8, 100)).toBe(100);
});

test("재생 중간 시간은 캔버스 폭의 같은 비율 위치에 대응한다", () => {
  expect(timeToX(4, 8, 100)).toBe(50);
});

test("오른쪽 화살표는 전체 길이의 5% 만큼 앞으로 가고 왼쪽 화살표는 5% 만큼 되돌아간다", () => {
  expect(keySeekTime("ArrowRight", 4, 20)).toBe(5);
  expect(keySeekTime("ArrowLeft", 4, 20)).toBe(3);
});

test("화살표로 이동해도 0 보다 앞이나 전체 길이보다 뒤로 가지 않는다", () => {
  expect(keySeekTime("ArrowLeft", 0.5, 20)).toBe(0);
  expect(keySeekTime("ArrowRight", 19.5, 20)).toBe(20);
});

test("Home 은 처음으로, End 는 끝으로 이동한다", () => {
  expect(keySeekTime("Home", 7, 20)).toBe(0);
  expect(keySeekTime("End", 7, 20)).toBe(20);
});

test("이동 키가 아니면 null 을 돌려준다", () => {
  expect(keySeekTime("a", 7, 20)).toBeNull();
});
