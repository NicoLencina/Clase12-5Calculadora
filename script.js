document.addEventListener('DOMContentLoaded', () => {
    const displayResult = document.querySelector('.display .result');
    const displayHistory = document.querySelector('.display .history');
    const stepsList = document.getElementById('steps-list');
    const buttonsContainer = document.querySelector('.buttons');

    let currentInput = '0';
    let currentExpression = '';
    let shouldResetDisplay = false;

    const buttonLayout = [
        'sin', 'cos', 'tan', 'C', 'CE',
        'log', '√', 'x²', '(', ')',
        '7', '8', '9', '÷',
        '4', '5', '6', '×',
        '1', '2', '3', '-',
        '0', '.', '+', '='
    ];

    function createButtons() {
        buttonLayout.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn;
            button.dataset.value = btn;

            if (['+', '-', '×', '÷'].includes(btn)) {
                button.classList.add('operator');
            } else if (['sin', 'cos', 'tan', 'log', '√', 'x²'].includes(btn)) {
                button.classList.add('function');
            } else if (btn === '=') {
                button.classList.add('equal');
            } else if (btn === '0') {
                button.classList.add('zero');
            }

            buttonsContainer.appendChild(button);
        });
    }

    function updateDisplay() {
        displayResult.textContent = currentInput;
        displayHistory.textContent = currentExpression;
    }

    function handleInput(value) {
        if (!isNaN(value) || value === '.') {
            handleNumber(value);
        } else if (['+', '-', '×', '÷'].includes(value)) {
            handleOperator(value);
        } else {
            handleFunction(value);
        }
        updateDisplay();
    }

    function handleNumber(value) {
        if (shouldResetDisplay) {
            currentInput = '0';
            shouldResetDisplay = false;
        }

        if (value === '.' && currentInput.includes('.')) return;
        if (currentInput === '0' && value !== '.') {
            currentInput = value;
        } else {
            currentInput += value;
        }
    }

    function handleOperator(value) {
        if (currentInput === '' && currentExpression === '') return;

        if (currentInput !== '') {
            currentExpression += ` ${currentInput} ${value}`;
            currentInput = '';
            shouldResetDisplay = true;
        } else if (currentExpression !== '') {
            // Reemplazar el último operador si se presiona otro
            const lastChar = currentExpression.trim().slice(-1);
            if (['+', '-', '×', '÷'].includes(lastChar)) {
                currentExpression = currentExpression.trim().slice(0, -1) + value;
            }
        }
    }

    const scientificFunctions = ['sin', 'cos', 'tan', 'log', '√', 'x²'];

    function handleFunction(value) {
        if (scientificFunctions.includes(value)) {
            // Si hay un número en el input, lo añadimos a la expresión antes de la función
            if (currentInput !== '0' && currentInput !== '') {
                 currentExpression += ` ${currentInput} × `;
            }
            if (value === '√') {
                currentExpression += ` ${value} ( `;
            } else if (value === 'x²') {
                // Se aplica al número anterior, requiere un manejo especial en el parser
                currentExpression += ` ${currentInput} ^ 2 `;
                currentInput = '';
            }
            else {
                currentExpression += ` ${value} ( `;
            }
            currentInput = ''; // Limpiar input para el siguiente número
            shouldResetDisplay = false;

        } else {
            switch (value) {
                case '(':
                    // Añadir '×' implícito si hay un número antes
                    if (currentInput !== '0' && currentInput !== '') {
                        currentExpression += ` ${currentInput} × ( `;
                        currentInput = '';
                    } else {
                        currentExpression += ' ( ';
                    }
                    break;
                case ')':
                    currentExpression += ` ${currentInput} ) `;
                    currentInput = '';
                    break;
                case 'C':
                    currentInput = '0';
                    currentExpression = '';
                    stepsList.innerHTML = '';
                    break;
                case 'CE':
                    currentInput = '0';
                    break;
                case '=':
                    calculate();
                    break;
            }
        }
    }

    function precedence(op) {
        if (scientificFunctions.includes(op)) return 4;
        if (op === '^') return 3;
        if (op === '×' || op === '÷') return 2;
        if (op === '+' || op === '-') return 1;
        return 0;
    }

    function applyOp(op, b, a) {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '×': return a * b;
            case '÷':
                if (b === 0) throw "Division by zero";
                return a / b;
            case '^': return Math.pow(a, b);
        }
    }

    function applyFunc(func, val) {
        switch (func) {
            case 'sin': return Math.sin(val * Math.PI / 180);
            case 'cos': return Math.cos(val * Math.PI / 180);
            case 'tan': return Math.tan(val * Math.PI / 180);
            case 'log': return Math.log10(val);
            case '√': return Math.sqrt(val);
        }
    }

    function calculate() {
        // Añadir el input actual a la expresión antes de calcular
        if (currentInput !== '' && currentInput !== '0' || currentExpression.trim().slice(-1) === ')') {
             currentExpression += ` ${currentInput}`;
        }
        currentInput = '';

        let fullExpression = currentExpression.trim();
        if (fullExpression === '') return;

        stepsList.innerHTML = '';

        try {
            const result = evaluateExpression(fullExpression);
            stepsList.innerHTML += `<li><strong>Resultado Final: ${result}</strong></li>`;

            currentInput = result.toString();
            currentExpression = '';
            shouldResetDisplay = true;
        } catch (error) {
            currentInput = 'Error';
            currentExpression = '';
            stepsList.innerHTML = `<li>Error: ${error}</li>`;
        }
    }

    function evaluateExpression(expression) {
        // 1. Tokenizer
        const regex = /(sin|cos|tan|log|√|\d+\.?\d*|[+\-×÷\^()])/g;
        const tokens = expression.replace(/\s+/g, '').match(regex) || [];

        let values = [];
        let ops = [];
        let stepCounter = 1;

        const isFunction = (token) => scientificFunctions.includes(token);

        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];

            if (!isNaN(parseFloat(token))) {
                values.push(parseFloat(token));
            } else if (isFunction(token)) {
                ops.push(token);
            } else if (token === '(') {
                ops.push(token);
            } else if (token === ')') {
                while (ops.length && ops[ops.length - 1] !== '(') {
                    let op = ops.pop();
                    if (isFunction(op)) {
                        let val = values.pop();
                        let res = applyFunc(op, val);
                        values.push(res);
                        stepsList.innerHTML += `<li>Paso ${stepCounter++}: ${op}(${val}) = ${res}</li>`;
                    } else {
                        let val2 = values.pop();
                        let val1 = values.pop();
                        let res = applyOp(op, val2, val1);
                        values.push(res);
                        stepsList.innerHTML += `<li>Paso ${stepCounter++}: ${val1} ${op} ${val2} = ${res}</li>`;
                    }
                }
                if (ops[ops.length - 1] === '(') {
                    ops.pop(); // Pop '('
                }
            } else { // Operator
                while (ops.length && precedence(ops[ops.length - 1]) >= precedence(token)) {
                     let op = ops.pop();
                     if (isFunction(op)) {
                        let val = values.pop();
                        let res = applyFunc(op, val);
                        values.push(res);
                        stepsList.innerHTML += `<li>Paso ${stepCounter++}: ${op}(${val}) = ${res}</li>`;
                    } else {
                        let val2 = values.pop();
                        let val1 = values.pop();
                        let res = applyOp(op, val2, val1);
                        values.push(res);
                        stepsList.innerHTML += `<li>Paso ${stepCounter++}: ${val1} ${op} ${val2} = ${res}</li>`;
                    }
                }
                ops.push(token);
            }
        }

        while (ops.length > 0) {
            let op = ops.pop();
             if (isFunction(op)) {
                let val = values.pop();
                let res = applyFunc(op, val);
                values.push(res);
                stepsList.innerHTML += `<li>Paso ${stepCounter++}: ${op}(${val}) = ${res}</li>`;
            } else {
                let val2 = values.pop();
                let val1 = values.pop();
                let res = applyOp(op, val2, val1);
                values.push(res);
                stepsList.innerHTML += `<li>Paso ${stepCounter++}: ${val1} ${op} ${val2} = ${res}</li>`;
            }
        }
        return values[0];
    }

    buttonsContainer.addEventListener('click', (event) => {
        if (event.target.tagName !== 'BUTTON') return;
        handleInput(event.target.dataset.value);
    });

    createButtons();
    updateDisplay();
});
