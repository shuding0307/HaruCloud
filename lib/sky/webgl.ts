/** 전체 화면 삼각형 하나로 프래그먼트 셰이더를 그리는 최소한의 WebGL1 도우미 */

export function compileProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("셰이더 생성 실패");
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`셰이더 컴파일 실패: ${log ?? ""}`);
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("프로그램 생성 실패");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`프로그램 링크 실패: ${log ?? ""}`);
  }
  return program;
}

/** 화면을 덮는 삼각형 버퍼를 만들어 aPos 에 연결한다. */
export function bindFullscreenTriangle(gl: WebGLRenderingContext, program: WebGLProgram): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("버퍼 생성 실패");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  return buffer;
}

export function loseContext(gl: WebGLRenderingContext) {
  gl.getExtension("WEBGL_lose_context")?.loseContext();
}
