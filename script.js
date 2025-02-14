document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const experience = document.getElementById("experience").value.trim();
        const skills = document.getElementById("skills").value.trim();
        const status = document.getElementById("status").value;
        const resume = document.getElementById("resume").files[0];

        if (!name) {
            alert("Please enter your name.");
            return;
        }
        
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }
        
        const phonePattern = /^\d{10}$/;
        if (!phonePattern.test(phone)) {
            alert("Please enter a valid 10-digit phone number.");
            return;
        }
        
        if (!experience || isNaN(experience) || experience < 0) {
            alert("Please enter a valid experience in years.");
            return;
        }
        
        if (!skills) {
            alert("Please enter your skills.");
            return;
        }
        
        if (!status) {
            alert("Please select a status.");
            return;
        }
        
        if (!resume) {
            alert("Please upload a resume.");
            return;
        }

        const allowedExtensions = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        if (!allowedExtensions.includes(resume.type)) {
            alert("Please upload a valid file (PDF, DOC, DOCX).");
            return;
        }

        form.submit();
    });
});

   
document.getElementById("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent form submission from reloading the page

    const searchTerm = document.querySelector("input[name='searchTerm']").value;
    const resultDiv = document.getElementById("result");

    try {
        const response = await fetch("/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ searchTerm }),
        });

        if (response.ok) {
            const data = await response.json();
            if (typeof data === "string") {
                resultDiv.innerHTML = `<p>${data}</p>`;
            } else {
                resultDiv.innerHTML = `
                    <p>Candidate found in Excel:</p>
                    <pre>${JSON.stringify(data.excelRow, null, 2)}</pre>
                `;
            }
        } else {
            resultDiv.innerHTML = `<p>No matching candidate found.</p>`;
        }
    } catch (error) {
        console.error("Error:", error);
        resultDiv.innerHTML = `<p>An error occurred. Please try again later.</p>`;
    }
});
