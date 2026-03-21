#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define MAX_LINE_LEN 65536
#define MAX_FIELDS 1000

char delimiter = ','; // Глобальный разделитель

// Определение разделителя по первой строке
char detect_delimiter(char *line) {
    int comma_count = 0;
    int semicolon_count = 0;
    int in_quotes = 0;
    
    for (char *p = line; *p; p++) {
        if (*p == '"') {
            in_quotes = !in_quotes;
        } else if (!in_quotes) {
            if (*p == ',') comma_count++;
            if (*p == ';') semicolon_count++;
        }
    }
    
    return (semicolon_count > comma_count) ? ';' : ',';
}

// Проверка, является ли строка числом
int is_number(const char *str) {
    if (!str || !*str) return 0;
    
    while (*str == ' ') str++;
    if (*str == '\0') return 0;
    
    if (*str == '-') str++;
    if (*str == '\0') return 0;
    
    int has_digit = 0;
    int has_dot = 0;
    
    while (*str) {
        if (*str >= '0' && *str <= '9') {
            has_digit = 1;
        } else if (*str == '.') {
            if (has_dot) return 0;
            has_dot = 1;
        } else if (*str == ' ') {
            while (*str == ' ') str++;
            if (*str != '\0') return 0;
            break;
        } else {
            return 0;
        }
        str++;
    }
    
    return has_digit;
}

// Парсинг CSV строки с динамическим разделителем
int parse_csv_line(char *line, char **fields, int max_fields) {
    int count = 0;
    char *start = line;
    int in_quotes = 0;
    
    for (char *p = line; *p && count < max_fields; p++) {
        if (*p == '"') {
            in_quotes = !in_quotes;
        } else if (*p == delimiter && !in_quotes) {
            *p = '\0';
            fields[count] = strdup(start);
            count++;
            start = p + 1;
        }
    }
    
    if (count < max_fields) {
        fields[count] = strdup(start);
        count++;
    }
    
    return count;
}

// Освобождение памяти
void free_fields(char **fields, int count) {
    for (int i = 0; i < count; i++) {
        free(fields[i]);
    }
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <input.csv> [column] [has_header]\n", argv[0]);
        return 1;
    }
    
    char *input = argv[1];
    int col = (argc >= 3) ? atoi(argv[2]) : 1;
    int has_header = (argc >= 4) ? atoi(argv[3]) : 1;
    int col_index = col - 1;
    
    FILE *f = fopen(input, "r");
    if (!f) {
        fprintf(stderr, "ERROR: Cannot open file '%s'\n", input);
        return 1;
    }
    
    char line[MAX_LINE_LEN];
    char **header = NULL;
    int header_count = 0;
    
    if (!fgets(line, sizeof(line), f)) {
        fprintf(stderr, "ERROR: Empty file\n");
        fclose(f);
        return 1;
    }
    line[strcspn(line, "\r\n")] = 0;
    
    delimiter = detect_delimiter(line);
    
    if (has_header) {
        header = malloc(MAX_FIELDS * sizeof(char*));
        header_count = parse_csv_line(line, header, MAX_FIELDS);
    }
    
    double sum = 0.0;
    int numeric_count = 0;
    double min_val = 0, max_val = 0;
    int first = 1;
    
    while (fgets(line, sizeof(line), f)) {
        line[strcspn(line, "\r\n")] = 0;
        
        if (strlen(line) == 0) continue;
        
        char **fields = malloc(MAX_FIELDS * sizeof(char*));
        int field_count = parse_csv_line(line, fields, MAX_FIELDS);
        
        if (col_index < field_count) {
            char *value = fields[col_index];
            char *clean_value = value;
            
            if (value[0] == '"') {
                clean_value = value + 1;
                int len = strlen(clean_value);
                if (len > 0 && clean_value[len-1] == '"') {
                    clean_value[len-1] = '\0';
                }
            }
            
            if (is_number(clean_value)) {
                double num = strtod(clean_value, NULL);
                sum += num;
                numeric_count++;
                
                if (first) {
                    min_val = max_val = num;
                    first = 0;
                } else {
                    if (num < min_val) min_val = num;
                    if (num > max_val) max_val = num;
                }
            }
        }
        
        free_fields(fields, field_count);
        free(fields);
    }
    
    fclose(f);
    
    // Выводим только числа: минимум максимум среднее сумма
    if (numeric_count > 0) {
        double average = sum / numeric_count;
        printf("%.2f %.2f %.2f %.2f\n", min_val, max_val, average, sum);
    } else {
        printf("0.00 0.00 0.00 0.00\n");
    }
    
    if (has_header && header) {
        free_fields(header, header_count);
        free(header);
    }
    
    return 0;
}