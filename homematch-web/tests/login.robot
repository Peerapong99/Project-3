
*** Settings ***
Library           SeleniumLibrary
Suite Setup       Open HomeMatch Login
Suite Teardown    Close All Browsers

*** Variables ***
${URL}             http://localhost:5173/login
${BROWSER}         Chrome
${LOGIN_EMAIL}     ${EMPTY}
${LOGIN_PASSWORD}  ${EMPTY}

*** Keywords ***
Open HomeMatch Login
    Open Browser    ${URL}    ${BROWSER}
    Maximize Browser Window
    Wait Until Page Contains Element    id=email    timeout=15s
    Wait Until Page Contains Element    id=password    timeout=10s

Submit Login
    Click Element    css=button[type="submit"]

*** Test Cases ***
TC01 - Display Login Page
    [Documentation]    ตรวจสอบว่าหน้า Login แสดงผลถูกต้อง
    Wait Until Page Contains    ยินดีต้อนรับกลับ
    Page Should Contain    HomeMatch
    Page Should Contain Element    id=email
    Page Should Contain Element    id=password
    Page Should Contain Element    css=button[type="submit"]

TC02 - Empty Email And Password
    [Documentation]    ตรวจสอบการส่งฟอร์มโดยไม่กรอกข้อมูล
    Submit Login
    ${email_missing}=    Execute Javascript
    ...    return document.getElementById('email').validity.valueMissing;
    Should Be True    ${email_missing}
    Location Should Contain    /login

TC03 - Invalid Email Format
    [Documentation]    ตรวจสอบอีเมลที่ไม่ถูกต้อง
    Input Text    id=email    abc
    Input Password    id=password    test123
    Submit Login
    ${invalid_email}=    Execute Javascript
    ...    return document.getElementById('email').validity.typeMismatch;
    Should Be True    ${invalid_email}
    Location Should Contain    /login

TC04 - Wrong Login Credentials
    [Documentation]    ตรวจสอบการเข้าสู่ระบบด้วยข้อมูลผิด
    Input Text    id=email    wrong@example.com
    Input Password    id=password    WrongPassword123
    Submit Login
    Wait Until Element Is Visible    xpath=//*[@role="alert"]
    Location Should Contain    /login

TC05 - Show And Hide Password
    [Documentation]    ตรวจสอบปุ่มแสดงและซ่อนรหัสผ่าน
    Input Password    id=password    test123
    Click Element    css=button[aria-label="แสดงรหัสผ่าน"]
    ${password_type}=    Get Element Attribute    id=password    type
    Should Be Equal    ${password_type}    text
    Click Element    css=button[aria-label="ซ่อนรหัสผ่าน"]
    ${password_type}=    Get Element Attribute    id=password    type
    Should Be Equal    ${password_type}    password

TC06 - Remember Email Checkbox
    [Documentation]    ตรวจสอบการเลือกจำอีเมล
    ${checkbox}=    Get WebElement    xpath=//input[@type="checkbox"]
    ${initial_state}=    Get Element Attribute
    ...    xpath=//input[@type="checkbox"]    checked
    Click Element    xpath=//label[.//input[@type="checkbox"]]
    ${new_state}=    Execute Javascript
    ...    return document.querySelector('input[type="checkbox"]').checked;
    Should Not Be Equal    ${new_state}    ${initial_state}
