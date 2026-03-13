// Pricing Page Logic

function openPricingPage() {
    const page = document.getElementById('pricing-page');
    if (page) {
        page.style.display = 'block';
        document.body.style.overflow = 'hidden'; // prevent background scrolling
    }
}

function closePricingPage() {
    const page = document.getElementById('pricing-page');
    if (page) {
        page.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function switchUserType(type) {
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`btn-${type}`).classList.add('active');

    // Show/hide relevant cards
    const individualCards = document.getElementById('individual-cards');
    const professionalCards = document.getElementById('professional-cards');
    
    if (type === 'individual') {
        if (individualCards) individualCards.style.display = 'grid';
        if (professionalCards) professionalCards.style.display = 'none';
    } else {
        if (individualCards) individualCards.style.display = 'none';
        if (professionalCards) professionalCards.style.display = 'grid';
    }

    // Update table
    updateComparisonTable(type);
}

function updateComparisonTable(type) {
    const tbody = document.getElementById('comparison-tbody');
    if (!tbody) return;

    if (type === 'individual') {
        tbody.innerHTML = `
            <tr>
                <td>Optimizations</td>
                <td>3 files</td>
                <td>5 files</td>
                <td>Unlimited</td>
            </tr>
            <tr>
                <td>Compression Type</td>
                <td>Basic</td>
                <td>Advanced</td>
                <td>Advanced</td>
            </tr>
            <tr>
                <td>Priority Processing</td>
                <td>-</td>
                <td>Yes</td>
                <td>Yes</td>
            </tr>
            <tr>
                <td>Support</td>
                <td>-</td>
                <td>-</td>
                <td>Email Support</td>
            </tr>
        `;
    } else {
        tbody.innerHTML = `
            <tr>
                <td>Staff Seats</td>
                <td>1</td>
                <td>Up to 10</td>
                <td>Unlimited</td>
            </tr>
            <tr>
                <td>Batch Optimization</td>
                <td>50 files</td>
                <td>Unlimited</td>
                <td>Unlimited</td>
            </tr>
            <tr>
                <td>Client Management</td>
                <td>Basic</td>
                <td>Firm-wide</td>
                <td>Enterprise</td>
            </tr>
            <tr>
                <td>Support</td>
                <td>Email Support</td>
                <td>Priority Support</td>
                <td>Dedicated Support</td>
            </tr>
            <tr>
                <td>Analytics</td>
                <td>-</td>
                <td>Basic Dashboard</td>
                <td>Comprehensive</td>
            </tr>
        `;
    }
}

function toggleFAQ(button) {
    const answer = button.nextElementSibling;
    const icon = button.querySelector('.icon');
    
    if (answer.classList.contains('open')) {
        answer.classList.remove('open');
        icon.textContent = '+';
    } else {
        // Close others
        document.querySelectorAll('.faq-answer').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('.faq-question .icon').forEach(el => el.textContent = '+');
        
        answer.classList.add('open');
        icon.textContent = '-';
    }
}

function selectPlan(plan) {
    const planDetails = {
        free: { name: 'Free Trial', price: 0, product_id: 'free_trial' },
        paygo: { name: 'Pay-As-You-Go', price: 29, product_id: 'paygo_5credits' },
        annual: { name: 'Annual Pro', price: 199, product_id: 'annual_pro' },
        solo: { name: 'Solo Practitioner', price: 499, product_id: 'solo_pro' },
        firm: { name: 'Small Firm', price: 1899, product_id: 'firm_10seats' },
        enterprise: { name: 'Site License', price: 4999, product_id: 'enterprise_un' }
    };
    
    const selected = planDetails[plan];
    
    // Redirect to PayFast checkout or signup
    if (plan === 'free') {
        window.location.href = '/signup?plan=free';
    } else {
        // Use existing PayFast integration
        window.location.href = `/checkout?plan=${plan}&price=${selected.price}`;
    }
}
