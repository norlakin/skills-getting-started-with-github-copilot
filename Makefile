# Makefile for running tests and coverage
.PHONY: test coverage-html clean-coverage

# Run tests with coverage reported to the terminal
test:
	pytest -q --cov=src --cov-report=term-missing

# Generate an HTML coverage report in htmlcov/
coverage-html:
	pytest --cov=src --cov-report=html

# Clean coverage artifacts
clean-coverage:
	rm -rf htmlcov .coverage
