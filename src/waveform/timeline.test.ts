import { expect, test } from "vitest";
import { playbackTime, timeToX, xToTime } from "./timeline";

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
