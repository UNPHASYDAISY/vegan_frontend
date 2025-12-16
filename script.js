document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const apiBase = 'https://vegan-backend-1zi7.onrender.com/api/products/';
    
    // --- STATE MANAGEMENT ---
    let currentPage = 1;
    let currentCategory = null; 
    let currentStatus = null; // NEW: Track selected status
    let currentVendor = getVendorFromQuery(); // Get vendor from URL (?vendor=Zepto)
    let isFetching = false;

    // --- DOM ELEMENTS ---
    const productContainer = document.getElementById('product-container');
    const categoryContainer = document.getElementById('category-container');
    const statusContainer = document.getElementById('status-container'); // NEW
    const loadingMessage = document.getElementById('loading-message');
    const vendorFilterMessage = document.getElementById('vendor-filter-message');
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    // --- HELPER FUNCTIONS ---
    function getVendorFromQuery() {
        const params = new URLSearchParams(window.location.search);
        return params.get('vendor');
    }

    // --- 1. FETCH CATEGORIES (Sidebar) ---
    function fetchCategories() {
        fetch(`${apiBase}categories/`)
            .then(res => res.json())
            .then(categories => {
                if (!categoryContainer) return;
                categoryContainer.innerHTML = '';

                // Create "All" Button
                const allBtn = createCategoryButton('All', null);
                setActiveButton(allBtn); // Default active
                categoryContainer.appendChild(allBtn);

                // Create Buttons for each category
                categories.forEach(cat => {
                    const btn = createCategoryButton(cat, cat);
                    categoryContainer.appendChild(btn);
                });
            })
            .catch(err => console.error("Failed to load categories", err));
    }

    function createCategoryButton(label, categoryValue) {
        const btn = document.createElement('button');
        btn.textContent = label;
        // Base styling for sidebar buttons
        btn.className = 'w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900';
        
        btn.addEventListener('click', () => {
            // 1. Update Visual State
            const allButtons = categoryContainer.querySelectorAll('button');
            allButtons.forEach(b => {
                b.classList.remove('bg-primary', 'text-white');
                b.classList.add('bg-white', 'dark:bg-gray-900', 'text-gray-600');
            });
            setActiveButton(btn);

            // 2. Update Logic State
            currentCategory = categoryValue;
            currentPage = 1; // RESET page to 1
            
            // 3. Clear container immediately to show we are reloading
            productContainer.innerHTML = '';
            
            // 4. Fetch new data
            fetchProducts();
        });
        return btn;
    }

    function setActiveButton(btn) {
        btn.classList.remove('bg-white', 'dark:bg-gray-900', 'text-gray-600');
        btn.classList.add('bg-primary', 'text-white');
    }

    // --- NEW FUNCTION: INITIALIZE STATUS FILTERS ---
    function initStatusFilters() {
        if (!statusContainer) return;
        statusContainer.innerHTML = '';

        const statuses = [
            { label: 'All', value: null },
            { label: 'Vegan', value: 'VEGAN' },
            { label: 'Not Vegan', value: 'NON_VEGAN' },
            { label: 'Unsure', value: 'UNSURE' }
        ];

        statuses.forEach(status => {
            const btn = document.createElement('button');
            btn.textContent = status.label;
            // Same styling as category buttons
            btn.className = 'w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900';
            
            // Highlight "All" by default
            if (status.value === null) {
                btn.classList.remove('bg-white', 'dark:bg-gray-900', 'text-gray-600');
                btn.classList.add('bg-primary', 'text-white');
            }

            btn.addEventListener('click', () => {
                // 1. Reset visual styles for all status buttons
                const allButtons = statusContainer.querySelectorAll('button');
                allButtons.forEach(b => {
                    b.classList.remove('bg-primary', 'text-white');
                    b.classList.add('bg-white', 'dark:bg-gray-900', 'text-gray-600');
                });
                // 2. Set active style for clicked button
                btn.classList.remove('bg-white', 'dark:bg-gray-900', 'text-gray-600');
                btn.classList.add('bg-primary', 'text-white');

                // 3. Update Logic
                currentStatus = status.value;
                currentPage = 1; // Reset to page 1
                
                // 4. Reload
                const productContainer = document.getElementById('product-container');
                productContainer.innerHTML = '';
                fetchProducts(); // Or fetchPage(), whatever your main function is named
            });

            statusContainer.appendChild(btn);
        });
    }

    // --- 2. FETCH PRODUCTS (Main Logic) ---
    async function fetchProducts() {
        if (isFetching) return;
        isFetching = true;

        // Show loading message only if it's the first page
        if (currentPage === 1) {
            loadingMessage.style.display = 'block';
            loadMoreContainer.style.display = 'none';
        } else {
            loadMoreBtn.textContent = 'Loading...';
        }

        // Build URL with parameters
        let url = new URL(apiBase);
        url.searchParams.append('page', currentPage);
        
        if (currentVendor) {
            url.searchParams.append('vendor', currentVendor);
            if (vendorFilterMessage) {
                vendorFilterMessage.style.display = 'block';
                vendorFilterMessage.innerHTML = `Showing products from: <b>${currentVendor}</b>`;
            }
        }
        
        if (currentCategory) {
            url.searchParams.append('category', currentCategory);
        }

        // NEW: Add Status Filter
        if (currentStatus) {
            url.searchParams.append('status', currentStatus);
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            // Hide loading
            loadingMessage.style.display = 'none';
            loadMoreBtn.textContent = 'Load More';
            isFetching = false;

            // Handle "No Products Found"
            if (currentPage === 1 && data.results.length === 0) {
                productContainer.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <span class="material-icons text-6xl text-gray-300 mb-4">search_off</span>
                        <p class="text-xl text-gray-500">No products found.</p>
                    </div>`;
                loadMoreContainer.style.display = 'none';
                return;
            }

            // Render cards
            renderProductCards(data.results);

            // Toggle "Load More" button based on backend response
            if (data.has_next) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }

        } catch (error) {
            console.error('Error fetching products:', error);
            loadingMessage.textContent = 'Error loading products. Please refresh.';
            isFetching = false;
        }
    }

    function renderProductCards(products) {
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col h-full';

            const price = (product.price) ? `₹${parseFloat(product.price).toFixed(2)}` : '';
            const description = product.description ? (product.description.length > 100 ? product.description.substring(0, 100) + '...' : product.description) : 'No description available.';
            const image = product.image_url || 'https://placehold.co/600x400?text=No+Image';
            const link = product.product_link || '#';
            const category = product.category || 'Pantry';

            // Badge Logic
            let statusColor = 'bg-gray-100 text-gray-600';
            let statusText = 'Unknown';
            const status = (product.vegan_status || '').toLowerCase();
            
            if (status === 'vegan') {
                statusColor = 'bg-green-100 text-green-700 border border-green-200';
                statusText = 'Vegan';
            } else if (status === 'non_vegan') {
                statusColor = 'bg-red-100 text-red-700 border border-red-200';
                statusText = 'Not Vegan';
            } else if (status === 'unsure') {
                statusColor = 'bg-orange-100 text-orange-700 border border-orange-200';
                statusText = 'Unsure';
            }

            card.innerHTML = `
                <div class="relative h-48 overflow-hidden group">
                    <img src="${image}" alt="${product.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
                    <span class="absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full ${statusColor}">
                        ${statusText}
                    </span>
                </div>
                
                <div class="p-5 flex-grow flex flex-col">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-medium text-primary bg-green-50 px-2 py-1 rounded">${category}</span>
                        ${product.vendor ? `<span class="text-xs text-gray-400 font-mono">${product.vendor}</span>` : ''}
                    </div>
                    
                    <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-2 leading-tight line-clamp-2">${product.name}</h3>
                    
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow line-clamp-3">${description}</p>
                    
                    <div class="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <span class="text-xl font-bold text-gray-900 dark:text-white">${price}</span>
                        <a href="${link}" target="_blank" class="flex items-center gap-1 text-sm font-medium text-white bg-primary hover:bg-green-600 px-4 py-2 rounded-lg transition-colors">
                            View Product
                        </a>
                    </div>
                </div>
            `;
            productContainer.appendChild(card);
        });
    }

    // --- 3. EVENT LISTENERS ---
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++; // INCREMENT PAGE
            fetchProducts(); // Append next batch
        });
    }

    // --- 4. INITIALIZATION ---
    initStatusFilters(); // NEW
    fetchCategories(); 
    fetchProducts();   
});