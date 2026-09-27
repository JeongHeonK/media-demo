export function xToTime(x: number, width: number, duration: number): number {
	return Math.min(Math.max((x / width) * duration, 0), duration);
}

export function playbackTime(
	now: number,
	startedAt: number,
	offset: number,
	duration: number,
): number {
	return Math.min(now - startedAt + offset, duration);
}

export function timeToX(time: number, duration: number, width: number): number {
	return (time / duration) * width;
}
