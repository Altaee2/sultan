document.addEventListener('DOMContentLoaded', async() => {
    // دوال التحقق الجديدة

    const validateName = (value) => value.trim() !== '' && /^[\u0600-\u06FFa-zA-Z\s]+$/.test(value);
    const validateUserId = (value) => /^\d{8,10}$/.test(value);
    const validateUsername = (value) => /^[a-zA-Z0-9_]+$/.test(value);
    const validateNumber = (value) => /^\d+$/.test(value);
    const validateCardNumber = (value) => /^\d{12}$|^\d{14}$/.test(value);
    const validatePhoneNumber = (value) => /^07\d{9}$/.test(value);

    // دالة التحقق من حقل معين

    function validateField(inputElement, validator, errorMessage) {
        const value = inputElement.value;
        const errorP = inputElement.parentElement.querySelector('.error-message');

        if (!errorP) {
            console.error("Error: The error message element was not found for", inputElement);
            return true;
        }

        if (value.trim() === '') {
            inputElement.classList.remove('input-error');
            errorP.style.display = 'none';
            return true;
        }

        if (validator(value)) {
            inputElement.classList.remove('input-error');
            errorP.style.display = 'none';
            return true;
        } else {
            inputElement.classList.add('input-error');
            errorP.textContent = errorMessage;
            errorP.style.display = 'block';
            return false;
        }
    }

    // دوال مساعدة للحصول على المتحقق والرسالة

    function getValidatorForInput(input) {
        if (input.id === 'name' || input.id === 'card-name' || input.id === 'account-name') return validateName;
        if (input.id === 'user-id') return validateUserId;
        if (input.id === 'username') return validateUsername;
        if (input.id === 'counter-value' || input.id === 'amount') return validateNumber;
        if (input.id === 'card-number' || input.id === 'account-number') return validateCardNumber;
        if (input.id === 'phone-number') return validatePhoneNumber;
        if (input.id === 'points-link') return (value) => value.trim() !== '';
        return () => true;
    }

    function getErrorMessageForInput(input) {
        if (input.id === 'name' || input.id === 'card-name' || input.id === 'account-name') return 'يجب أن يحتوي على حروف عربية أو إنجليزية فقط.';
        if (input.id === 'user-id') return 'الـ ID يجب أن يتكون من 8 إلى 10 أرقام فقط.';
        if (input.id === 'username') return 'اليوزر يجب أن يحتوي على حروف إنجليزية وأرقام أو شرطة سفلية (_).';
        if (input.id === 'counter-value') return 'قيمة العداد يجب أن تكون أرقاماً فقط.';
        if (input.id === 'amount') return 'كمية السحب يجب أن تكون أرقاماً فقط.';
        if (input.id === 'card-number' || input.id === 'account-number') return 'رقم الحساب/البطاقة يجب أن يكون 12 أو 14 رقماً.';
        if (input.id === 'phone-number') return 'رقم الهاتف يجب أن يتكون من 11 رقماً ويبدأ بـ 07.';
        if (input.id === 'points-link') return 'هذا الحقل مطلوب.';
        return '';
    }

    // العناصر الرئيسية

    const withdrawalMethodSelect = document.getElementById('withdrawal-method');
    const basicFields = document.getElementById('basic-fields');
    const methodFieldsContainer = document.getElementById('method-fields');
    const statusMessage = document.getElementById('status-message');
    const banStatusMessage = document.getElementById('ban-status-message');
    const userIdInput = document.getElementById('user-id');
    const submitBtn = document.getElementById('submit-btn');
    const withdrawalForm = document.getElementById('withdrawal-form');
    const loadingSpinner = document.getElementById('loading-spinner');
    const successModal = document.getElementById('success-modal');
    const closeModalBtn = successModal.querySelector('.close-button');
    document.getElementById('year').textContent = new Date().getFullYear();

    // جلب بيانات send.json و info.json

    let config = {};
    let bannedUsers = [];
    try {
        const configResponse = await fetch('send.json');
        config = await configResponse.json();
        const bannedResponse = await fetch('info.json');
        const bannedData = await bannedResponse.json();
        bannedUsers = bannedData.bannedUsers; // هذه القائمة الآن تحتوي على كائنات
    } catch (error) {
        console.error('Failed to load configuration files:', error);
        showModal('خطأ في الإعدادات', 'حدث خطأ في تحميل ملفات إعدادات الموقع. يرجى التواصل مع الدعم.', 'error');
        return;
    }

    // حالة الطرق المتوفرة

    const options = {
        timeZone: 'Asia/Baghdad',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true // حتى يكون بصيغة 24 ساعة
    };



    const methodsStatus = {
        mastercard: 'available',
        zaincash: 'available',
        asiacell: 'available',
        atheer: 'unavailable'
    };

    function attachValidationListeners() {
        const allInputs = document.querySelectorAll('#withdrawal-form input');
        allInputs.forEach(input => {
            input.removeEventListener('input', onInputChange);
            input.addEventListener('input', onInputChange);
        });
    }

    function onInputChange(event) {
        const input = event.target;
        validateField(input, getValidatorForInput(input), getErrorMessageForInput(input));
    }

    attachValidationListeners();

    withdrawalMethodSelect.addEventListener('change', () => {
        const selectedMethod = withdrawalMethodSelect.value;
        statusMessage.style.display = 'none';
        basicFields.classList.add('hidden');
        methodFieldsContainer.innerHTML = '';
        submitBtn.classList.add('hidden');

        if (selectedMethod) {
            const status = methodsStatus[selectedMethod];
            if (status === 'unavailable') {
                statusMessage.textContent = 'هذه الطريقة غير متوفرة حاليًا. يرجى اختيار طريقة أخرى.';
                statusMessage.className = 'alert-message alert-danger';
                statusMessage.style.display = 'block';
            } else {
                basicFields.classList.remove('hidden');
                statusMessage.className = 'alert-message alert-success';
                statusMessage.textContent = 'هذه الطريقة متوفرة. يرجى ملء الحقول.';
                statusMessage.style.display = 'block';
                createMethodFields(selectedMethod);
                attachValidationListeners();
            }
        }
    });

    // الجزء المعدل في السكربت لإظهار سبب الحظر
    userIdInput.addEventListener('input', () => {
        const userId = userIdInput.value.trim();
        banStatusMessage.style.display = 'none';

        if (userId) {
            // البحث عن المستخدم المحظور باستخدام find()
            const bannedUser = bannedUsers.find(user => user.id === userId);

            if (bannedUser) {
                // إذا تم العثور على المستخدم، اعرض رسالة الحظر مع السبب
                banStatusMessage.innerHTML = `حسابك محظور. لا يمكنك سحب الأرباح.<br> السبب: **${bannedUser.banReason}**`;
                banStatusMessage.className = 'alert-message alert-danger';
                banStatusMessage.style.display = 'block';
                submitBtn.disabled = true;
            } else {
                // إذا لم يتم العثور على المستخدم، اعرض رسالة طبيعية
                banStatusMessage.textContent = 'حسابك غير محظور. يمكنك المتابعة.';
                banStatusMessage.className = 'alert-message alert-success';
                banStatusMessage.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.classList.remove('hidden');
            }
        } else {
            submitBtn.classList.add('hidden');
        }
    });

    function createMethodFields(method) {
        let fieldsHTML = '';
        if (method === 'mastercard') {
            fieldsHTML = `
                <div class="form-group">
                    <label for="card-number">رقم البطاقة:</label>
                    <input type="text" id="card-number" name="card-number" required>
                    <p class="error-message"></p>
                </div>
                <div class="form-group">
                    <label for="card-name">اسم البطاقة:</label>
                    <input type="text" id="card-name" name="card-name" required>
                    <p class="error-message"></p>
                </div>
            `;
        } else if (method === 'zaincash') {
            fieldsHTML = `
                <div class="form-group">
                    <label for="account-number">رقم الحساب:</label>
                    <input type="text" id="account-number" name="account-number" required>
                    <p class="error-message"></p>
                </div>
                <div class="form-group">
                    <label for="account-name">اسم الحساب:</label>
                    <input type="text" id="account-name" name="account-name" required>
                    <p class="error-message"></p>
                </div>
            `;
        } else if (method === 'asiacell' || method === 'atheer') {
            fieldsHTML = `
                <div class="form-group">
                    <label for="phone-number">الرقم:</label>
                    <input type="tel" id="phone-number" name="phone-number" required>
                    <p class="error-message"></p>
                </div>
            `;
        }
        methodFieldsContainer.innerHTML = fieldsHTML;
    }

    function validateAllFields() {
        let isValid = true;
        const allInputs = document.querySelectorAll('#withdrawal-form input[required]');
        allInputs.forEach(input => {
            if (!validateField(input, getValidatorForInput(input), getErrorMessageForInput(input))) {
                isValid = false;
            }
        });
        return isValid;
    }

    withdrawalForm.addEventListener('submit', async(e) => {
        e.preventDefault();

        if (!validateAllFields()) {
            return;
        }

        loadingSpinner.classList.remove('hidden');
        submitBtn.disabled = true;

        const formatter = new Intl.DateTimeFormat('ar-IQ', options);
        const baghdadTime = formatter.format(new Date());
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.withdrawalMethod = withdrawalMethodSelect.value;

        // التعديل هنا لتفادي مشكلة الـ Markdown
        const escapedUsername = data.username.replace(/_/g, '\\_');

        // سوينا escape لحرف الـ _ برابط النقاط حتى ما يسبب مشكلة بالـ Markdown
        const escapedPointsLink = data['points-link'].replace(/_/g, '\\_');

        const message = `مرحبا عزيزي لديك طلب سحب جديد 💫

⌚️ الوقت والتاريخ: ${baghdadTime}
💳 طريقة السحب : ${data.withdrawalMethod}
👤 الاسم : ${data.name}
🫆 الايدي : ${data['user-id']}
🔘 اليوزر : @${escapedUsername}
🔗 رابط النقاط: ${escapedPointsLink}
🔘 قيمة العداد : ${data['counter-value']}
💰 كمية السحب : ${data.amount} الف

🪪تفاصيل السحب (للدفع):
${getFormattedDetails(data)}
`;

        const telegramApiUrl = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

        try {
            const response = await fetch(telegramApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: config.chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            if (response.ok) {
                loadingSpinner.classList.add('hidden');
                showModal('تم الإرسال بنجاح', 'لقد تم إرسال طلبك بنجاح. سيتم مراجعته قريباً.', 'success');
                withdrawalForm.reset();
                basicFields.classList.add('hidden');
                methodFieldsContainer.innerHTML = '';
                statusMessage.style.display = 'none';
                banStatusMessage.style.display = 'none';
                submitBtn.classList.add('hidden');
            } else {
                loadingSpinner.classList.add('hidden');
                showModal('خطأ في الإرسال', 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.', 'error');
            }
        } catch (error) {
            loadingSpinner.classList.add('hidden');
            console.error('Error:', error);
            showModal('خطأ في الاتصال', 'حدث خطأ في الاتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مجدداً.', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });

    function getFormattedDetails(data) {
        const method = data.withdrawalMethod;
        if (method === 'mastercard') {
            return `**رقم البطاقة:** ${data['card-number']}\n**اسم البطاقة:** ${data['card-name']}`;
        } else if (method === 'zaincash') {
            return `**رقم الحساب:** ${data['account-number']}\n**اسم الحساب:** ${data['account-name']}`;
        } else if (method === 'asiacell' || method === 'atheer') {
            return `**الرقم:** ${data['phone-number']}`;
        }
        return '';
    }

    function showModal(title, message, type) {
        const modalTitle = successModal.querySelector('#modal-title');
        const modalMessage = successModal.querySelector('#modal-message');
        const modalIcon = successModal.querySelector('.modal-icon');

        modalTitle.textContent = title;
        modalMessage.textContent = message;

        if (modalIcon) {
            modalIcon.classList.remove('fa-check-circle', 'fa-times-circle', 'success-icon', 'error-icon');
            if (type === 'success') {
                modalIcon.classList.add('fas', 'fa-check-circle', 'success-icon');
            } else if (type === 'error') {
                modalIcon.classList.add('fas', 'fa-times-circle', 'error-icon');
            }
        }

        successModal.classList.remove('hidden');
    }

    closeModalBtn.addEventListener('click', () => {
        successModal.classList.add('hidden');
    });

    window.addEventListener('click', (event) => {
        if (event.target == successModal) {
            successModal.classList.add('hidden');
        }
    });
});
