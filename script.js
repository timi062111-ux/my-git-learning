let expression = '';
let lastAnswer = 0;
let angleMode = 'DEG';
let history = [];

const expressionView = document.querySelector('#expression');
const resultView = document.querySelector('#result');
const historyPanel = document.querySelector('#history');
const historyList = document.querySelector('#history-list');

class Parser {
  constructor(input) {
    this.tokens = input.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[a-z]+|π|[()+\-*/^!%]/gi) || [];
    this.position = 0;
    this.source = input.replace(/\s/g, '');
    if (this.tokens.join('') !== this.source) throw new Error('包含无法识别的字符');
  }

  peek() { return this.tokens[this.position]; }
  take() { return this.tokens[this.position++]; }

  parse() {
    if (!this.tokens.length) throw new Error('请输入算式');
    const value = this.additive();
    if (this.position !== this.tokens.length) throw new Error('算式格式不完整');
    return value;
  }

  additive() {
    let value = this.multiplicative();
    while (this.peek() === '+' || this.peek() === '-') {
      const operator = this.take();
      const right = this.multiplicative();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  multiplicative() {
    let value = this.unary();
    while (this.peek() === '*' || this.peek() === '/') {
      const operator = this.take();
      const right = this.unary();
      if (operator === '/' && right === 0) throw new Error('不能除以零');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }

  unary() {
    if (this.peek() === '+') { this.take(); return this.unary(); }
    if (this.peek() === '-') { this.take(); return -this.unary(); }
    return this.power();
  }

  power() {
    let value = this.postfix();
    if (this.peek() === '^') {
      this.take();
      value = Math.pow(value, this.unary());
    }
    return value;
  }

  postfix() {
    let value = this.primary();
    while (this.peek() === '!' || this.peek() === '%') {
      value = this.take() === '!' ? factorial(value) : value / 100;
    }
    return value;
  }

  primary() {
    const token = this.take();
    if (token === '(') {
      const value = this.additive();
      if (this.take() !== ')') throw new Error('缺少右括号');
      return value;
    }
    if (token === 'π') return Math.PI;
    if (token === 'e') return Math.E;
    if (/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(token || '')) return Number(token);
    if (/^[a-z]+$/i.test(token || '')) {
      if (this.take() !== '(') throw new Error(`${token} 后需要括号`);
      const value = this.additive();
      if (this.take() !== ')') throw new Error('缺少右括号');
      return applyFunction(token.toLowerCase(), value);
    }
    throw new Error('算式格式有误');
  }
}

function factorial(value) {
  if (!Number.isInteger(value) || value < 0) throw new Error('阶乘仅支持非负整数');
  if (value > 170) throw new Error('阶乘结果过大');
  let result = 1;
  for (let number = 2; number <= value; number += 1) result *= number;
  return result;
}

function applyFunction(name, value) {
  const angle = angleMode === 'DEG' ? value * Math.PI / 180 : value;
  const functions = {
    sin: () => Math.sin(angle),
    cos: () => Math.cos(angle),
    tan: () => Math.tan(angle),
    log: () => {
      if (value <= 0) throw new Error('对数的真数必须大于零');
      return Math.log10(value);
    },
    ln: () => {
      if (value <= 0) throw new Error('对数的真数必须大于零');
      return Math.log(value);
    },
    sqrt: () => {
      if (value < 0) throw new Error('暂不支持负数开平方');
      return Math.sqrt(value);
    },
    exp: () => Math.exp(value),
    abs: () => Math.abs(value)
  };
  if (!functions[name]) throw new Error(`不支持函数 ${name}`);
  return functions[name]();
}

function normalize(value) {
  if (!Number.isFinite(value)) throw new Error('结果超出可计算范围');
  if (Math.abs(value) < 1e-14) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 1e12 || (absolute > 0 && absolute < 1e-9)) return value.toExponential(10).replace(/\.0+e/, 'e');
  return Number(value.toPrecision(12)).toString();
}

function calculate() {
  try {
    const source = expression.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
    const value = new Parser(source).parse();
    const formatted = normalize(value);
    lastAnswer = value;
    resultView.textContent = formatted;
    resultView.classList.remove('error');
    history.unshift({ expression, result: formatted });
    history = history.slice(0, 6);
    renderHistory();
  } catch (error) {
    resultView.textContent = error.message;
    resultView.classList.add('error');
  }
}

function render() {
  expressionView.textContent = expression || '0';
  if (!expression) {
    resultView.textContent = '0';
    resultView.classList.remove('error');
  }
}

function renderHistory() {
  historyList.replaceChildren();
  if (!history.length) {
    historyList.textContent = '暂无记录';
    return;
  }
  history.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item';
    const left = document.createElement('span');
    const right = document.createElement('strong');
    left.textContent = item.expression;
    right.textContent = `= ${item.result}`;
    row.append(left, right);
    historyList.append(row);
  });
}

function insert(value) {
  expression += value;
  render();
}

document.querySelector('.keys').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.insert) insert(button.dataset.insert);
  const actions = {
    clear: () => { expression = ''; render(); },
    backspace: () => { expression = expression.slice(0, -1); render(); },
    calculate,
    square: () => insert('^2'),
    'ten-power': () => insert('10^('),
    answer: () => insert(normalize(lastAnswer))
  };
  actions[button.dataset.action]?.();
});

document.querySelectorAll('.mode').forEach(button => {
  button.addEventListener('click', () => {
    angleMode = button.dataset.mode;
    document.querySelectorAll('.mode').forEach(item => item.classList.toggle('active', item === button));
  });
});

document.querySelector('#theme').addEventListener('click', () => document.body.classList.toggle('dark'));
document.querySelector('#history-toggle').addEventListener('click', () => { historyPanel.hidden = !historyPanel.hidden; });
document.querySelector('#history-clear').addEventListener('click', () => { history = []; renderHistory(); });

document.addEventListener('keydown', event => {
  if (/^[0-9.+\-*/^()%!]$/.test(event.key)) insert(event.key.replace('*', '×').replace('/', '÷').replace('-', '−'));
  else if (event.key === 'Enter') { event.preventDefault(); calculate(); }
  else if (event.key === 'Backspace') { expression = expression.slice(0, -1); render(); }
  else if (event.key === 'Escape') { expression = ''; render(); }
});

render();
