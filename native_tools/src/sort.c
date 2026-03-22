#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

// Структура для хранения строки
typedef struct {
    char **cells;
    int cell_count;
} Row;

int sort_col;
int sort_asc;

// Функция для определения числа
int is_number(const char *str) {
    if (!str || !*str) return 0;
    char *endptr;
    strtod(str, &endptr);
    return *endptr == '\0';
}

// Сравнение строк
int compare_rows(const Row *a, const Row *b) {
    const char *s1 = (sort_col < a->cell_count) ? a->cells[sort_col] : "";
    const char *s2 = (sort_col < b->cell_count) ? b->cells[sort_col] : "";
    
    int num1 = is_number(s1);
    int num2 = is_number(s2);
    
    if (num1 && num2) {
        double d1 = strtod(s1, NULL);
        double d2 = strtod(s2, NULL);
        int cmp = (d1 < d2) ? -1 : (d1 > d2) ? 1 : 0;
        return sort_asc ? cmp : -cmp;
    } else {
        int cmp = strcmp(s1, s2);
        return sort_asc ? cmp : -cmp;
    }
}

// Функция для qsort
int compare(const void *a, const void *b) {
    return compare_rows((Row*)a, (Row*)b);
}

// Освобождение памяти
void free_row(Row *row) {
    for (int i = 0; i < row->cell_count; i++) {
        free(row->cells[i]);
    }
    free(row->cells);
}

// Парсинг строки CSV (простой парсер)
int parse_csv_line(char *line, char **cells, int max_cells) {
    int count = 0;
    char *start = line;
    int in_quotes = 0;
    
    for (char *p = line; *p && count < max_cells; p++) {
        if (*p == '"') {
            in_quotes = !in_quotes;
        } else if (*p == ',' && !in_quotes) {
            *p = '\0';
            cells[count] = _strdup(start);
            count++;
            start = p + 1;
        }
    }
    
    if (count < max_cells) {
        cells[count] = _strdup(start);
        count++;
    }
    
    return count;
}

int main(int argc, char *argv[]) {
    if (argc < 3) {
        printf("Usage: %s <input.csv> <output.csv> [col] [asc]\n", argv[0]);
        printf("  col - column number (1-based, default: 1)\n");
        printf("  asc - 1=ascending, 0=descending (default: 1)\n");
        printf("\nNOTE: Convert your Excel files to CSV first!\n");
        printf("In Excel: File -> Save As -> CSV UTF-8\n");
        return 1;
    }
    
    char *input = argv[1];
    char *output = argv[2];
    int col = (argc >= 4) ? atoi(argv[3]) : 1;
    sort_asc = (argc >= 5) ? atoi(argv[4]) : 1;
    sort_col = col - 1;
    
    printf("=== CSV Sorter ===\n");
    printf("Input: %s\n", input);
    printf("Output: %s\n", output);
    printf("Column: %d (%s)\n\n", col, sort_asc ? "ascending" : "descending");
    
    // Открываем файл
    FILE *f = fopen(input, "r");
    if (!f) {
        printf("ERROR: Cannot open %s\n", input);
        return 1;
    }
    
    // Читаем заголовок
    char line[65536];
    if (!fgets(line, sizeof(line), f)) {
        printf("ERROR: Empty file\n");
        fclose(f);
        return 1;
    }
    
    // Удаляем \n
    line[strcspn(line, "\r\n")] = 0;
    
    // Парсим заголовок
    char *header[1000];
    int header_count = parse_csv_line(line, header, 1000);
    
    printf("Header: %d columns\n", header_count);
    for (int i = 0; i < header_count && i < 10; i++) {
        printf("  [%d] %s\n", i+1, header[i]);
    }
    if (header_count > 10) printf("  ...\n");
    
    // Проверка колонки
    if (sort_col >= header_count) {
        printf("\nWARNING: Column %d not found, using column 1\n", col);
        sort_col = 0;
    }
    
    // Читаем данные
    printf("\nReading data...\n");
    Row *rows = NULL;
    int row_count = 0;
    int capacity = 1000;
    
    rows = malloc(capacity * sizeof(Row));
    
    while (fgets(line, sizeof(line), f)) {
        line[strcspn(line, "\r\n")] = 0;
        
        if (row_count >= capacity) {
            capacity *= 2;
            rows = realloc(rows, capacity * sizeof(Row));
        }
        
        rows[row_count].cells = malloc(1000 * sizeof(char*));
        rows[row_count].cell_count = parse_csv_line(line, rows[row_count].cells, 1000);
        row_count++;
        
        if (row_count % 10000 == 0) {
            printf("  Read %d rows...\n", row_count);
        }
    }
    
    fclose(f);
    
    printf("\nTotal rows: %d\n", row_count);
    
    if (row_count == 0) {
        printf("No data\n");
        return 1;
    }
    
    // Сортируем
    printf("\nSorting...\n");
    qsort(rows, row_count, sizeof(Row), compare);
    printf("Done!\n");
    
    // Сохраняем
    printf("\nWriting to %s...\n", output);
    FILE *out = fopen(output, "w");
    
    // Заголовок
    for (int i = 0; i < header_count; i++) {
        fprintf(out, "%s", header[i]);
        if (i < header_count - 1) fprintf(out, ",");
    }
    fprintf(out, "\n");
    
    // Данные
    for (int i = 0; i < row_count; i++) {
        for (int j = 0; j < rows[i].cell_count; j++) {
            // Проверяем нужно ли кавычки
            char *val = rows[i].cells[j];
            int need_quote = strchr(val, ',') || strchr(val, '"') || strchr(val, '\n');
            
            if (need_quote) {
                fprintf(out, "\"");
                for (char *p = val; *p; p++) {
                    if (*p == '"') fprintf(out, "\"\"");
                    else fprintf(out, "%c", *p);
                }
                fprintf(out, "\"");
            } else {
                fprintf(out, "%s", val);
            }
            
            if (j < rows[i].cell_count - 1) fprintf(out, ",");
        }
        fprintf(out, "\n");
        
        if ((i+1) % 10000 == 0) {
            printf("  Written %d rows...\n", i+1);
        }
    }
    
    fclose(out);
    
    // Очистка
    for (int i = 0; i < header_count; i++) free(header[i]);
    for (int i = 0; i < row_count; i++) free_row(&rows[i]);
    free(rows);
    
    printf("\n=== DONE ===\n");
    printf("Sorted %d rows\n", row_count);
    
    return 0;
}