async function loadNavbar() {
    let response = await fetch('../Navbar/navbar.html');
    let content = await response.text();
    document.getElementById('navbar-placeholder').innerHTML = content;
}