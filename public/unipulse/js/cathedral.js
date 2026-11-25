/* Model original, în metri. Originea este axul turlei centrale; fațada este la nord. */
const CATHEDRAL = (() => {
  const center = [21.22421, 45.75065];
  // ID-uri din stratul building al OpenMapTiles (amprenta și părțile catedralei).
  // app.js adaugă automat și alte părți aflate pe amplasament (refreshCathedralParts).
  const footprints = [1944505162, 249524830, 15757905052, 15757905070, 15757905080, 15758044580,
    15757943180, 15758044602, 15758044540, 15758044622, 15758044632, 15758044642];
  const angle = 24 * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  function makeMesh() {
    const vertices = [];
    const rectangle = [[-1,-1],[1,-1],[1,1],[-1,1]];
    const octagon = Array.from({length:8}, (_, i) => {
      const a = (i + 0.5) * Math.PI / 4;
      return [Math.cos(a), Math.sin(a)];
    });
    const apse = Array.from({length:14}, (_, i) => {
      const a = i * Math.PI * 2 / 14;
      return [Math.cos(a), Math.sin(a)];
    });
    const distance = (a,b) => Math.hypot(...a.map((x,i) => x - b[i]));
    function triangle(a, b, c, uvA, uvB, uvC, material) {
      const [dx, dy, dz] = b.map((x,i) => x - a[i]);
      const [ex, ey, ez] = c.map((x,i) => x - a[i]);
      const nx = dy*ez-dz*ey, ny = dz*ex-dx*ez, nz = dx*ey-dy*ex;
      const light = 0.78 + 0.35 * (nx * -0.43 + ny * 0.26 + nz * 0.86) / (Math.hypot(nx,ny,nz) || 1);
      for (const [[x,y,z], uv] of [[a,uvA],[b,uvB],[c,uvC]]) {
        vertices.push(x*cos + y*sin, x*sin - y*cos, z, ...uv, material, light);
      }
    }
    function profile(x,y, outline, levels) {
      const ring = ([z,w,d]) => outline.map(([u,v]) => [x + u*w, y + v*d, z]);
      for (let level = 1; level < levels.length; level++) {
        const bottom = ring(levels[level - 1]), top = ring(levels[level]);
        const material = levels[level][3];
        for (let i = 0; i < outline.length; i++) {
          const j = (i + 1) % outline.length;
          const a = bottom[i], b = bottom[j], c = top[j], d = top[i];
          const w = distance(a,b), t = distance(c,d), h = distance(a,d);
          const z = a[2];
          triangle(a,b,c,[0,z],[w,z],[(w+t)/2,z+h],material);
          triangle(a,c,d,[0,z],[(w+t)/2,z+h],[(w-t)/2,z+h],material);
        }
      }
      const roof = ring(levels.at(-1));
      for (let i = 1; i < roof.length - 1; i++) {
        triangle(roof[0],roof[i],roof[i+1],roof[0].slice(0,2),roof[i].slice(0,2),roof[i+1].slice(0,2),levels.at(-1)[3]);
      }
    }
    function box(x, y, bottom, top, w, d, material) {
      profile(x,y,rectangle,[[bottom,w,d],[top,w,d,material]]);
    }
    function tower(x,y,base,wall,radius,tip) {
      const flare = radius * 1.22;
      profile(x,y,octagon,[[base,radius,radius],[wall-1,radius,radius,3],
        [wall,flare,flare,2],[wall+1,flare,flare,2],
        [wall+(tip-wall)*0.37,radius*.58,radius*.58,1],
        [tip-3,radius*.2,radius*.2,1],[tip-1,radius*.22,radius*.22,2],
        [tip,radius*.07,radius*.07,2]]);
      box(x,y,tip-.4,tip+2.6,.12,.12,2);
      box(x,y,tip+1.2,tip+1.45,.82,.10,2);
      box(x,y,tip+1.2,tip+1.45,.10,.82,2);
    }
    // Nave, abside, pridvor și trepte.
    profile(0,-4,rectangle,[[0,10.6,22.5],[17,10.6,22.5,0],
      [18,11.3,22.8,2],[24,.7,20,1]]);
    profile(0,-25.8,apse,[[0,8.2,7.5],[11.8,8.2,7.5,0],[12.7,8.7,8,2],[17,.4,.4,1]]);
    for (const side of [-1,1]) {
      profile(side*10,-4,rectangle,[[0,4.4,16],[11,4.4,16,0],[12,4.8,16.4,2],[16,.55,14.6,1]]);
      for (const y of [-16,-9,0,9]) {
        box(side*14.4,y,0,9,.56,.68,2);
      }
    }
    profile(0,16.5,rectangle,[[0,7.2,5.4],[25,7.2,5.4,3],[26,7.7,5.8,2],[33,.5,2,1]]);
    profile(0,24,rectangle,[[0,7.3,4.1],[6.1,7.3,4.1,0],[7.3,8.2,4.6,2],[10,5.8,2,1]]);
    for (let i = 0; i < 5; i++) box(0,30-i*.45,i*.28,(i+1)*.28,8.1-i*.17,1.8,2);
    for (const x of [-6,-4,-2,0,2,4,6]) box(x,28.15,1.1,6.2,.24,.31,2);
    // Turla principală, cele două turnuri de fațadă și turlele secundare.
    tower(0,0,16,49,5.65,81);
    tower(0,15.6,25,35,3.7,50);
    tower(0,-18,13,24,3.4,37);
    for (const side of [-1,1]) {
      tower(side*9.7,16.9,0,25,3.2,39);
      tower(side*8.8,7,13,23,2.55,35);
      tower(side*9.8,-4,12,21,2.6,33);
      tower(side*8.8,-15.6,11,20,2.35,31);
    }
    return new Float32Array(vertices);
  }

  function createLayer() {
    let program, buffer, vao, matrix, detail, night, count;
    const projectionAtCathedral = new Float32Array(16);
    return {
      id: 'up-cathedral', type: 'custom', renderingMode: '3d',
      onAdd(map, gl) {
        const compile = (type, source) => {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
          return shader;
        };
        const vertex = compile(gl.VERTEX_SHADER, `#version 300 es
          uniform mat4 projection;
          in vec3 position;
          in vec2 uv;
          in float material;
          in float light;
          out vec2 tex;
          flat out float surface;
          flat out float shade;
          void main() {
            tex = uv; surface = material; shade = light;
            gl_Position = projection * vec4(position, 1.0);
          }`);
        const fragment = compile(gl.FRAGMENT_SHADER, `#version 300 es
          precision mediump float;
          in vec2 tex;
          flat in float surface;
          flat in float shade;
          uniform float detail;
          uniform float night;
          out vec4 pixel;
          // Linii subțiri fără aliasing: marginea se netezește pe lățimea unui pixel,
          // iar modelul dispare treptat când perioada lui devine mai mică decât câțiva pixeli.
          float line(float v, float edge) {
            float w = max(fwidth(v), 1e-4);
            float f = fract(v);
            return smoothstep(edge - w, edge + w, f) * (1.0 - smoothstep(1.0 - w, 1.0, f));
          }
          float fade(float period) { return clamp(1.6 - period * 3.2, 0.0, 1.0); }
          void main() {
            vec3 color;
            vec2 px = fwidth(tex);
            if (surface == 1.0) {
              vec2 tile = tex * vec2(2.45, 2.8);
              tile.x += mod(floor(tile.y), 2.0) * 0.5;
              float grid = (line(tile.x, 0.88) + line(tile.y, 0.89)) * fade(max(px.x * 2.45, px.y * 2.8));
              vec2 motif = abs(fract(tex / vec2(2.3, 2.8)) - 0.5);
              float soft = max(px.x / 2.3, px.y / 2.8);
              float diamond = 1.0 - smoothstep(0.038 - soft, 0.086 + soft, abs(motif.x + motif.y - 0.28));
              color = mix(vec3(0.20,0.40,0.35),vec3(0.82,0.65,0.31),diamond * detail * mix(0.55, 1.0, fade(soft * 2.0)));
              color *= 1.0 - grid * 0.15 * detail;
            } else if (surface == 2.0) {
              color = vec3(0.70,0.62,0.48);
            } else {
              float bandW = max(px.y * 1.25, 1e-4);
              float bandF = fract(tex.y * 1.25);
              float band = smoothstep(0.64 - bandW, 0.64 + bandW, bandF) * (1.0 - smoothstep(1.0 - bandW, 1.0, bandF));
              color = mix(vec3(0.61,0.39,0.29),vec3(0.76,0.66,0.52),band * 0.85);
              float course = floor(tex.y*4.2);
              float mortar = (line(tex.y*4.2, 0.93) + line(tex.x*2.0+course*0.5, 0.96)) * fade(max(px.y * 4.2, px.x * 2.0));
              vec2 bay = vec2(abs(fract(tex.x / 2.35) - 0.5),fract((tex.y-1.8)/5.5));
              vec2 bw = max(px / vec2(2.35, 5.5), vec2(1e-4));
              float arch = (1.0 - smoothstep(0.23 - bw.x, 0.23 + bw.x, bay.x))
                * smoothstep(0.20 - bw.y, 0.20 + bw.y, bay.y)
                * (1.0 - smoothstep(0.77 - sqrt(bay.x) * 0.32 - bw.y, 0.77 - sqrt(bay.x) * 0.32 + bw.y, bay.y));
              color = mix(color*(1.0 - mortar * 0.19 * detail),vec3(0.18,0.16,0.15),arch * detail * (surface==3.0 ? 0.96 : 0.76));
            }
            vec3 lit = color * shade;
            vec3 nightTint = lit * vec3(0.74, 0.82, 0.89) + vec3(0.02, 0.028, 0.035);
            pixel = vec4(mix(lit, nightTint, night), 1.0);
          }`);
        program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
        const mesh = makeMesh();
        count = mesh.length / 7;
        vao = gl.createVertexArray();
        buffer = gl.createBuffer();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
        for (const [name, size, offset] of [['position',3,0],['uv',2,3],['material',1,5],['light',1,6]]) {
          const attribute = gl.getAttribLocation(program,name);
          gl.enableVertexAttribArray(attribute);
          gl.vertexAttribPointer(attribute,size,gl.FLOAT,false,28,offset*4);
        }
        gl.bindVertexArray(null);
        matrix = gl.getUniformLocation(program,'projection');
        detail = gl.getUniformLocation(program,'detail');
        night = gl.getUniformLocation(program,'night');
        const coordinate = maplibregl.MercatorCoordinate.fromLngLat(center, 0);
        this.map = map;
        this.coordinate = coordinate;
      },
      render(gl, projection) {
        const zoom = this.map.getZoom();
        if (!program || zoom < 14.5 || !this.map.getBounds().contains(center)) return;
        const c = this.coordinate;
        const scale = c.meterInMercatorCoordinateUnits();
        for (let i = 0; i < 12; i++) projectionAtCathedral[i] = projection[i] * scale;
        for (let row = 0; row < 4; row++) {
          projectionAtCathedral[12+row] = projection[row]*c.x + projection[4+row]*c.y +
            projection[8+row]*c.z + projection[12+row];
        }
        gl.useProgram(program);
        gl.uniformMatrix4fv(matrix,false,projectionAtCathedral);
        gl.uniform1f(detail,Math.max(0.12, Math.min(1, (zoom-15.8)/2.5)));
        gl.uniform1f(night,Number(document.body.dataset.theme === 'night'));
        // Modelul împarte bufferul de adâncime cu clădirile 3D: fără depth test,
        // fețele din spate se desenau peste cele din față.
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES,0,count);
        gl.bindVertexArray(null);
      },
      onRemove(map, gl) {
        gl.deleteVertexArray(vao);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      }
    };
  }

  return {center, footprints, createLayer};
})();
