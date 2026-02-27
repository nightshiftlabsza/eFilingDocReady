from setuptools import setup, find_packages

setup(
    name='docfit',
    version='1.0.0',
    packages=find_packages(),
    install_requires=[
        'pymupdf>=1.24.0',
        'pikepdf>=8.0.0',
        'Pillow>=10.0.0',
        'click>=8.1.0',
        'numpy>=1.26.0',
    ],
    entry_points={
        'console_scripts': [
            'docfit=docfit.cli:main',
        ],
    },
    python_requires='>=3.10',
)
